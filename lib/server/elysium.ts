import { createPublicClient, http, type Address } from "viem";
import { claimAbi, tokenAbi } from "@/lib/abis";
import { getChainRpcUrl, getElysiumViemChain } from "@/lib/chains";
import {
  CLAIM_ADDRESS,
  CLAIM_CHAIN_ID,
  TOKEN_ADDRESS,
} from "@/lib/config";
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
  dailyAmount: bigint;
  lastClaim: bigint;
  nonce: bigint;
  paused: boolean;
  signer: Address;
  faucetBalance: bigint;
  chainTime: number;
};

export async function getClaimState(wallet: Address): Promise<ClaimState> {
  const client = await getClaimClient();

  const [dailyAmount, lastClaim, nonce, paused, signer, faucetBalance, block] =
    await Promise.all([
      client.readContract({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "dailyAmount",
      }),
      client.readContract({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "lastClaim",
        args: [wallet],
      }),
      client.readContract({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "nonces",
        args: [wallet],
      }),
      client.readContract({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "paused",
      }),
      client.readContract({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "signer",
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
    dailyAmount,
    lastClaim,
    nonce,
    paused,
    signer,
    faucetBalance,
    chainTime: Number(block.timestamp),
  };
}
