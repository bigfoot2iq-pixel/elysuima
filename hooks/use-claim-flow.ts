"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  type Hash,
} from "viem";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { toast } from "sonner";
import { claimAbi } from "@/lib/abis";
import { CLAIM_ADDRESS, IS_CONFIGURED } from "@/lib/config";
import { elysium } from "@/lib/chains";

export type ClaimPhase =
  | "idle"
  | "authorizing"
  | "submitting"
  | "pending"
  | "success"
  | "error";

type ClaimAuthorization = {
  amount: string;
  nonce: string;
  deadline: number;
  signature: `0x${string}`;
  chainId: number;
  claimAddress: string;
  eligibleChain?: string | null;
};

export class ClaimRequestError extends Error {
  code: string;
  nextClaimAt?: number;

  constructor(code: string, message: string, nextClaimAt?: number) {
    super(message);
    this.name = "ClaimRequestError";
    this.code = code;
    this.nextClaimAt = nextClaimAt;
  }
}

function readableError(error: unknown): string {
  if (error instanceof ClaimRequestError) return error.message;

  if (error instanceof BaseError) {
    const rejected = error.walk((cause) => cause instanceof UserRejectedRequestError);
    if (rejected) return "You rejected the request in your wallet.";

    const reverted = error.walk(
      (cause) => cause instanceof ContractFunctionRevertedError,
    ) as ContractFunctionRevertedError | null;

    const name = reverted?.data?.errorName;

    switch (name) {
      case "ClaimTooSoon":
        return "You already claimed. Come back when the countdown ends.";
      case "InvalidNonce":
        return "Your claim session expired. Request a fresh authorization.";
      case "InvalidAmount":
        return "The daily amount changed. Refresh and try again.";
      case "SignatureExpired":
        return "The authorization expired. Request a fresh one.";
      case "InvalidSignature":
        return "That authorization was invalid. Refresh and try again.";
      case "FaucetEmpty":
      case "ERC20InsufficientBalance":
        return "The faucet is empty right now. Try again soon.";
      case "EnforcedPause":
        return "Claims are paused by the owner.";
      default:
        break;
    }

    const message = reverted?.shortMessage ?? error.shortMessage ?? error.message;
    if (/insufficient funds/i.test(message)) {
      return "You need a little HYPE on Elysium for gas.";
    }
    if (/user rejected|denied/i.test(message)) {
      return "You rejected the request in your wallet.";
    }
    return message;
  }

  if (error instanceof Error) {
    if (/insufficient funds/i.test(error.message)) {
      return "You need a little HYPE on Elysium for gas.";
    }
    if (/user rejected|denied/i.test(error.message)) {
      return "You rejected the request in your wallet.";
    }
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function useClaimFlow(options: { onSuccess?: () => void } = {}) {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [phase, setPhase] = useState<ClaimPhase>("idle");
  const [hash, setHash] = useState<Hash | undefined>();
  const [error, setError] = useState<string | null>(null);

  const handledHash = useRef<Hash | undefined>(undefined);
  const onSuccessRef = useRef(options.onSuccess);

  useEffect(() => {
    onSuccessRef.current = options.onSuccess;
  }, [options.onSuccess]);

  const reset = useCallback(() => {
    setPhase("idle");
    setHash(undefined);
    setError(null);
    handledHash.current = undefined;
  }, []);

  const receipt = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  useEffect(() => {
    if (!hash || !receipt.isSuccess || handledHash.current === hash) return;

    handledHash.current = hash;
    setPhase("success");
    setError(null);
    toast.success("Claim complete", {
      id: hash,
      description: "Your ELYZ is in your wallet.",
    });
    onSuccessRef.current?.();

    // Let the confirmation panel breathe, then return the card to the
    // cooldown state without requiring a page reload.
    const timer = window.setTimeout(reset, 8_000);
    return () => window.clearTimeout(timer);
  }, [hash, receipt.isSuccess, reset]);

  const receiptError =
    hash && receipt.isError && receipt.error
      ? readableError(receipt.error)
      : null;

  useEffect(() => {
    if (!receiptError) return;
    toast.error("Claim failed", {
      id: hash,
      description: receiptError,
    });
  }, [hash, receiptError]);

  const claim = useCallback(async () => {
    if (!IS_CONFIGURED || !address) return;

    setError(null);
    // Clear a previous failed receipt so the new attempt shows its own state.
    setHash(undefined);

    try {
      if (chainId !== elysium.id) {
        await switchChainAsync({ chainId: elysium.id });
      }

      setPhase("authorizing");

      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
        cache: "no-store",
      });

      const payload = (await response.json()) as ClaimAuthorization & {
        error?: string;
        message?: string;
        nextClaimAt?: number;
      };

      if (!response.ok) {
        throw new ClaimRequestError(
          payload.error ?? "CLAIM_FAILED",
          payload.message ?? "Unable to authorize the claim.",
          payload.nextClaimAt,
        );
      }

      setPhase("submitting");

      const txHash = await writeContractAsync({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "claim",
        args: [
          BigInt(payload.amount),
          BigInt(payload.nonce),
          BigInt(payload.deadline),
          payload.signature,
        ],
      });

      setHash(txHash);
      setPhase("pending");
      toast.loading("Claim submitted", {
        id: txHash,
        description: "Waiting for Elysium to confirm…",
      });
    } catch (cause) {
      const message = readableError(cause);
      setPhase("error");
      setError(message);
      toast.error("Claim failed", { description: message });
    }
  }, [address, chainId, switchChainAsync, writeContractAsync]);

  return {
    phase: receiptError ? ("error" as const) : phase,
    hash,
    error: receiptError ?? error,
    claim,
    reset,
    receipt,
  };
}
