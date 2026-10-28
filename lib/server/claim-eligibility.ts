import { parseAbiItem, type Address } from "viem";
import { claimAbi, nftReadAbi } from "@/lib/abis";
import { CLAIM_ADDRESS } from "@/lib/config";
import { getClaimClient, getClaimState, type ClaimState } from "./elysium";

export type ClaimEligibility = {
  nft: {
    address: Address;
    balance: string;
    rewardPerNft: string;
    maxBatch: number;
    tokenIds: string[];
    claimedTokenIds: string[];
    claimableTokenIds: string[];
    claimableAmount: string;
  };
  community: {
    claimed: boolean;
    claimableAmount: string;
    claimFee: string;
  };
  pools: {
    nftRemaining: string;
    communityRemaining: string;
  };
  paused: boolean;
  chainTime: number;
  blockNumber: number;
};

type CacheEntry = {
  expiresAt: number;
  value: ClaimEligibility;
};

const CACHE_TTL_MS = 8_000;
const OWNERSHIP_CACHE_TTL_MS = 15_000;
const MAX_CACHE_ENTRIES = 200;
const READ_CHUNK = 100;
const MAX_SCAN_SUPPLY = 10_000n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const nftTransferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);

type OwnershipCacheEntry = {
  expiresAt: number;
  owners: Map<bigint, Address>;
};

const ownershipCache = new Map<string, OwnershipCacheEntry>();

const cache = new Map<string, CacheEntry>();

function cacheKey(wallet: Address, state: ClaimState) {
  return [
    wallet.toLowerCase(),
    state.nftAddress.toLowerCase(),
    state.blockNumber,
  ].join("|");
}

function remember(key: string, value: ClaimEligibility) {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

async function readOwners(
  client: Awaited<ReturnType<typeof getClaimClient>>,
  nftAddress: Address,
  ids: bigint[],
) {
  const owners: (Address | null)[] = [];

  for (let index = 0; index < ids.length; index += READ_CHUNK) {
    const chunk = ids.slice(index, index + READ_CHUNK);
    const results = await client.multicall({
      contracts: chunk.map((tokenId) => ({
        address: nftAddress,
        abi: nftReadAbi,
        functionName: "ownerOf" as const,
        args: [tokenId] as const,
      })),
      allowFailure: true,
    });

    for (let index = 0; index < results.length; index++) {
      const result = results[index];

      if (result.status === "success") {
        owners.push(result.result as Address);
        continue;
      }

      const tokenId = chunk[index];
      const owner = await client.readContract({
        address: nftAddress,
        abi: nftReadAbi,
        functionName: "ownerOf",
        args: [tokenId],
      });
      owners.push(owner);
    }
  }

  return owners;
}

async function readClaimedFlags(
  client: Awaited<ReturnType<typeof getClaimClient>>,
  ids: bigint[],
) {
  const claimed: boolean[] = [];

  for (let index = 0; index < ids.length; index += READ_CHUNK) {
    const chunk = ids.slice(index, index + READ_CHUNK);
    const results = await client.multicall({
      contracts: chunk.map((tokenId) => ({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "nftClaimed" as const,
        args: [tokenId] as const,
      })),
      allowFailure: true,
    });

    for (let index = 0; index < results.length; index++) {
      const result = results[index];

      if (result.status === "success") {
        claimed.push(Boolean(result.result));
        continue;
      }

      const tokenId = chunk[index];
      const value = await client.readContract({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "nftClaimed",
        args: [tokenId],
      });
      claimed.push(value);
    }
  }

  return claimed;
}

/**
 * ERC-721A exposes every token id a wallet owns in one call. This collection
 * uses ERC-721A, so avoid scanning the whole supply with ownerOf. If another
 * collection is configured later, fall back to the ownerOf scan.
 */
async function readOwnedTokenIds(
  client: Awaited<ReturnType<typeof getClaimClient>>,
  nftAddress: Address,
  wallet: Address,
) {
  try {
    const ids = await client.readContract({
      address: nftAddress,
      abi: nftReadAbi,
      functionName: "tokensOfOwner",
      args: [wallet],
    });

    return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  } catch {
    return null;
  }
}

/**
 * The deployed collection does not expose `tokensOfOwner`, so rebuild current
 * ownership from the standard ERC-721 Transfer logs. The snapshot is shared
 * across wallets for a few seconds to avoid re-running the log query for every
 * eligibility request.
 */
async function readOwnershipSnapshot(
  client: Awaited<ReturnType<typeof getClaimClient>>,
  nftAddress: Address,
) {
  const key = nftAddress.toLowerCase();
  const cached = ownershipCache.get(key);

  if (cached && cached.expiresAt > Date.now()) return cached.owners;

  const logs = await client.getLogs({
    address: nftAddress,
    event: nftTransferEvent,
    fromBlock: 0n,
    toBlock: "latest",
  });

  if (logs.length === 0) return null;

  const owners = new Map<bigint, Address>();

  for (const log of logs) {
    const { to, tokenId } = log.args;
    if (tokenId === undefined || to === undefined) continue;

    if (to.toLowerCase() === ZERO_ADDRESS) {
      owners.delete(tokenId);
    } else {
      owners.set(tokenId, to);
    }
  }

  if (ownershipCache.size >= MAX_CACHE_ENTRIES) ownershipCache.clear();
  ownershipCache.set(key, {
    expiresAt: Date.now() + OWNERSHIP_CACHE_TTL_MS,
    owners,
  });

  return owners;
}

async function readOwnedTokenIdsFromLogs(
  client: Awaited<ReturnType<typeof getClaimClient>>,
  nftAddress: Address,
  wallet: Address,
) {
  try {
    const owners = await readOwnershipSnapshot(client, nftAddress);
    if (!owners) return null;

    const walletKey = wallet.toLowerCase();
    return [...owners.entries()]
      .filter(([, owner]) => owner.toLowerCase() === walletKey)
      .map(([tokenId]) => tokenId)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  } catch {
    return null;
  }
}

/**
 * Reads live NFT ownership and claim status for a wallet. The claim contract is
 * permissionless; this endpoint only powers the UI so it can show which token
 * ids are claimable.
 */
export async function getClaimEligibility(
  wallet: Address,
): Promise<ClaimEligibility> {
  const state = await getClaimState();
  const key = cacheKey(wallet, state);
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const client = await getClaimClient();

  const [nftBalance, communityClaimed] = await Promise.all([
    client.readContract({
      address: state.nftAddress,
      abi: nftReadAbi,
      functionName: "balanceOf",
      args: [wallet],
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "communityClaimed",
      args: [wallet],
    }),
  ]);

  let tokenIds: bigint[] = [];
  let claimedTokenIds: bigint[] = [];
  let claimableTokenIds: bigint[] = [];

  if (nftBalance > 0n) {
    const erc721aIds = await readOwnedTokenIds(
      client,
      state.nftAddress,
      wallet,
    );
    const logIds =
      erc721aIds && erc721aIds.length > 0
        ? erc721aIds
        : await readOwnedTokenIdsFromLogs(client, state.nftAddress, wallet);

    if (logIds && logIds.length > 0) {
      tokenIds = logIds;
    } else {
      const totalMinted = await client.readContract({
        address: state.nftAddress,
        abi: nftReadAbi,
        functionName: "totalMinted",
      });

      if (totalMinted > MAX_SCAN_SUPPLY) {
        throw new Error("NFT collection is too large to scan for eligibility");
      }

      if (totalMinted > 0n) {
        const ids = Array.from({ length: Number(totalMinted) }, (_, index) =>
          BigInt(index + 1),
        );
        const owners = await readOwners(client, state.nftAddress, ids);
        const walletKey = wallet.toLowerCase();

        tokenIds = ids.filter(
          (_, index) => owners[index]?.toLowerCase() === walletKey,
        );
      }
    }

    if (tokenIds.length > 0) {
      const claimed = await readClaimedFlags(client, tokenIds);

      claimedTokenIds = tokenIds.filter((_, index) => claimed[index]);
      claimableTokenIds = tokenIds.filter((_, index) => !claimed[index]);
    }
  }

  const claimableAmount =
    BigInt(claimableTokenIds.length) * state.nftReward;
  const communityClaimableAmount = communityClaimed
    ? 0n
    : state.communityReward;

  const value: ClaimEligibility = {
    nft: {
      address: state.nftAddress,
      balance: nftBalance.toString(),
      rewardPerNft: state.nftReward.toString(),
      maxBatch: Number(state.maxBatch),
      tokenIds: tokenIds.map(String),
      claimedTokenIds: claimedTokenIds.map(String),
      claimableTokenIds: claimableTokenIds.map(String),
      claimableAmount: claimableAmount.toString(),
    },
    community: {
      claimed: communityClaimed,
      claimableAmount: communityClaimableAmount.toString(),
      claimFee: state.communityClaimFee.toString(),
    },
    pools: {
      nftRemaining: state.nftPoolRemaining.toString(),
      communityRemaining: state.communityPoolRemaining.toString(),
    },
    paused: state.paused,
    chainTime: state.chainTime,
    blockNumber: state.blockNumber,
  };

  remember(key, value);
  return value;
}
