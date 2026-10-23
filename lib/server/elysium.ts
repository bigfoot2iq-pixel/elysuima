import { createPublicClient, http, type Address } from "viem";
import { claimAbi, tokenAbi } from "@/lib/abis";
import { elysiumTestnet } from "@/lib/chains";
import { CLAIM_ADDRESS, TOKEN_ADDRESS } from "@/lib/config";

const rpcUrl =
  process.env.ELYSIUM_RPC_URL ??
  process.env.NEXT_PUBLIC_ELYSIUM_RPC_URL ??
  "https://testnet-rpc.elysium.kinetiq.xyz";

export const elysiumClient = createPublicClient({
  chain: elysiumTestnet,
  transport: http(rpcUrl, {
    timeout: 8_000,
    retryCount: 1,
  }),
});

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
  const [dailyAmount, lastClaim, nonce, paused, signer, faucetBalance, block] =
    await Promise.all([
      elysiumClient.readContract({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "dailyAmount",
      }),
      elysiumClient.readContract({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "lastClaim",
        args: [wallet],
      }),
      elysiumClient.readContract({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "nonces",
        args: [wallet],
      }),
      elysiumClient.readContract({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "paused",
      }),
      elysiumClient.readContract({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "signer",
      }),
      elysiumClient.readContract({
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [CLAIM_ADDRESS],
      }),
      elysiumClient.getBlock({ blockTag: "latest" }),
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
