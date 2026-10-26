import type { Address } from "viem";
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
const MAX_CACHE_ENTRIES = 200;
const READ_CHUNK = 100;
const MAX_SCAN_SUPPLY = 10_000n;

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
    const chunkOwners = await Promise.all(
      chunk.map((tokenId) =>
        client
          .readContract({
            address: nftAddress,
            abi: nftReadAbi,
            functionName: "ownerOf",
            args: [tokenId],
          })
          .catch(() => null),
      ),
    );

    owners.push(...chunkOwners);
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
    const chunkClaimed = await Promise.all(
      chunk.map((tokenId) =>
        client.readContract({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "nftClaimed",
          args: [tokenId],
        }),
      ),
    );

    claimed.push(...chunkClaimed);
  }

  return claimed;
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

      if (tokenIds.length > 0) {
        const claimed = await readClaimedFlags(client, tokenIds);

        claimedTokenIds = tokenIds.filter((_, index) => claimed[index]);
        claimableTokenIds = tokenIds.filter((_, index) => !claimed[index]);
      }
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
