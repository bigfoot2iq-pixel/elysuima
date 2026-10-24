import { createPublicClient, http, type Address } from "viem";
import { claimAbi, tokenAbi } from "@/lib/abis";
import { elysium } from "@/lib/chains";
import { CLAIM_ADDRESS, TOKEN_ADDRESS } from "@/lib/config";
import { getLaunchpadConfig } from "./launchpad-config";

type ServerClient = ReturnType<typeof createPublicClient>;

let cached: { rpcUrl: string; client: ServerClient } | undefined;

/**
 * The admin can change the RPC at runtime, so server-side reads use a client
 * keyed by the current launchpad RPC instead of a module-level singleton.
 */
export async function getElysiumClient(): Promise<ServerClient> {
  const config = await getLaunchpadConfig();

  if (cached?.rpcUrl !== config.rpcUrl) {
    cached = {
      rpcUrl: config.rpcUrl,
      client: createPublicClient({
        chain: elysium,
        transport: http(config.rpcUrl, {
          timeout: 8_000,
          retryCount: 1,
        }),
      }),
    };
  }

  return cached.client;
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
  const client = await getElysiumClient();

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
