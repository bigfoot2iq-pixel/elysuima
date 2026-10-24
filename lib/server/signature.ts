import type { Address, Hex } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { CLAIM_ADDRESS } from "@/lib/config";
import { elysium } from "@/lib/chains";

export const CLAIM_DOMAIN = {
  name: "ElyziumaDailyClaim",
  version: "1",
  chainId: elysium.id,
  verifyingContract: CLAIM_ADDRESS,
} as const;

export const CLAIM_TYPES = {
  Claim: [
    { name: "wallet", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export function getSignerAccount(): PrivateKeyAccount | null {
  const privateKey = process.env.FAUCET_SIGNER_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) return null;

  try {
    return privateKeyToAccount(privateKey as Hex);
  } catch {
    return null;
  }
}

export async function signClaim(input: {
  wallet: Address;
  amount: bigint;
  nonce: bigint;
  deadline: number;
}) {
  const account = getSignerAccount();
  if (!account) throw new Error("Claim signer is not configured");

  return account.signTypedData({
    domain: CLAIM_DOMAIN,
    types: CLAIM_TYPES,
    primaryType: "Claim",
    message: {
      wallet: input.wallet,
      amount: input.amount,
      nonce: input.nonce,
      deadline: BigInt(input.deadline),
    },
  });
}
