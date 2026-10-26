import { createPublicClient, http, type Address } from "viem";
import { claimAbi, tokenAbi } from "@/lib/abis";
import { getChainRpcUrl, getElysiumViemChain } from "@/lib/chains";
import { CLAIM_ADDRESS, CLAIM_CHAIN_ID, TOKEN_ADDRESS } from "@/lib/config";
import { getLaunchpadConfig } from "./launchpad-config";

type ServerClient = ReturnType<typeof createPublicClient>;

let cached: { key: string; client: ServerClient } | undefined;

/** A public client keyed by chain and RPC, so runtime changes take effect. */
function getClient(chainId: number, rpcUrl: string): ServerClient {
  const key = `${chainId}|${rpcUrl}`;

  if (cached?.key !== key) {
    cached = {
      key,
      client: createPublicClient({
        chain: getElysiumViemChain(chainId),
        transport: http(rpcUrl, {
          timeout: 8_000,
          retryCount: 1,
          batch: true,
        }),
      }),
    };
  }

  return cached.client;
}

/**
 * The admin can change the launchpad chain and RPC at runtime, so server-side
 * reads build a client from the current settings instead of a fixed singleton.
 */
export async function getElysiumClient(): Promise<ServerClient> {
  const config = await getLaunchpadConfig();
  return getClient(config.chainId, config.rpcUrl);
}

/**
 * Claims are pinned to `CLAIM_CHAIN_ID`, which can differ from the launchpad's
 * runtime chain. Follow the launchpad RPC only when it serves the claim chain.
 */
export async function getClaimClient(): Promise<ServerClient> {
  const config = await getLaunchpadConfig();
  const rpcUrl =
    config.chainId === CLAIM_CHAIN_ID
      ? config.rpcUrl
      : getChainRpcUrl(CLAIM_CHAIN_ID);

  return getClient(CLAIM_CHAIN_ID, rpcUrl);
}

export type ClaimState = {
  nftAddress: Address;
  nftReward: bigint;
  communityReward: bigint;
  maxBatch: bigint;
  communityClaimFee: bigint;
  feeRecipient: Address;
  accruedFees: bigint;
  nftClaimedTotal: bigint;
  communityClaimedTotal: bigint;
  nftClaimCount: bigint;
  communityClaimCount: bigint;
  nftPoolRemaining: bigint;
  communityPoolRemaining: bigint;
  paused: boolean;
  tokenBalance: bigint;
  chainTime: number;
  blockNumber: number;
};

export async function getClaimState(): Promise<ClaimState> {
  const client = await getClaimClient();

  const [
    nftAddress,
    nftReward,
    communityReward,
    maxBatch,
    communityClaimFee,
    feeRecipient,
    accruedFees,
    nftClaimedTotal,
    communityClaimedTotal,
    nftClaimCount,
    communityClaimCount,
    nftPoolRemaining,
    communityPoolRemaining,
    paused,
    tokenBalance,
    block,
  ] = await Promise.all([
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "nft",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "NFT_REWARD",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "COMMUNITY_REWARD",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "MAX_BATCH",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "communityClaimFee",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "feeRecipient",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "accruedFees",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "nftClaimedTotal",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "communityClaimedTotal",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "nftClaimCount",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "communityClaimCount",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "nftPoolRemaining",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "communityPoolRemaining",
    }),
    client.readContract({
      address: CLAIM_ADDRESS,
      abi: claimAbi,
      functionName: "paused",
    }),
    client.readContract({
      address: TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [CLAIM_ADDRESS],
    }),
    client.getBlock({ blockTag: "latest" }),
  ]);

  return {
    nftAddress,
    nftReward,
    communityReward,
    maxBatch,
    communityClaimFee,
    feeRecipient,
    accruedFees,
    nftClaimedTotal,
    communityClaimedTotal,
    nftClaimCount,
    communityClaimCount,
    nftPoolRemaining,
    communityPoolRemaining,
    paused,
    tokenBalance,
    chainTime: Number(block.timestamp),
    blockNumber: Number(block.number),
  };
}
