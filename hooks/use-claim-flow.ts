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
import { CLAIM_ADDRESS, CLAIM_CHAIN_ID, IS_CONFIGURED } from "@/lib/config";

export type ClaimPhase =
  | "idle"
  | "authorizing"
  | "submitting"
  | "pending"
  | "success"
  | "error";

function readableError(error: unknown): string {
  if (error instanceof BaseError) {
    const rejected = error.walk(
      (cause) => cause instanceof UserRejectedRequestError,
    );
    if (rejected) return "You rejected the request in your wallet.";

    const reverted = error.walk(
      (cause) => cause instanceof ContractFunctionRevertedError,
    ) as ContractFunctionRevertedError | null;

    const name = reverted?.data?.errorName;

    switch (name) {
      case "CommunityAlreadyClaimed":
        return "This wallet already claimed the community reward.";
      case "NftAlreadyClaimed":
        return "One of these NFTs already claimed its reward.";
      case "NotNftOwner":
        return "You no longer own one of these NFTs. Refresh and try again.";
      case "BatchTooLarge":
        return "Too many NFTs in one claim. Try a smaller batch.";
      case "IncorrectFee":
        return "The community claim fee changed. Refresh and try again.";
      case "PoolExhausted":
        return "This claim pool is empty.";
      case "EnforcedPause":
        return "Claims are paused by the owner.";
      case "ERC20InsufficientBalance":
        return "The claim pool is underfunded right now. Try again later.";
      case "OwnerQueryForNonexistentToken":
        return "One of these NFTs does not exist.";
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
    chainId: CLAIM_CHAIN_ID,
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

    // Let the confirmation panel breathe, then return to the ready state.
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

  const submit = useCallback(
    async (label: string, action: () => Promise<Hash>) => {
      if (!IS_CONFIGURED || !address) return;

      setError(null);
      setHash(undefined);
      handledHash.current = undefined;

      try {
        if (chainId !== CLAIM_CHAIN_ID) {
          setPhase("authorizing");
          await switchChainAsync({ chainId: CLAIM_CHAIN_ID });
        }

        setPhase("submitting");
        const txHash = await action();
        setHash(txHash);
        setPhase("pending");
        toast.loading(`${label} submitted`, {
          id: txHash,
          description: "Waiting for Elysium to confirm…",
        });
      } catch (cause) {
        const message = readableError(cause);
        setPhase("error");
        setError(message);
        toast.error("Claim failed", { description: message });
      }
    },
    [address, chainId, switchChainAsync],
  );

  const claimNft = useCallback(
    async (tokenIds: bigint[]) => {
      if (tokenIds.length === 0) return;

      await submit("NFT claim", () =>
        writeContractAsync({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "claimNft",
          args: [tokenIds],
          chainId: CLAIM_CHAIN_ID,
        }),
      );
    },
    [submit, writeContractAsync],
  );

  const claimCommunity = useCallback(
    async (fee: bigint) => {
      await submit("Community claim", () =>
        writeContractAsync({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "claimCommunity",
          value: fee,
          chainId: CLAIM_CHAIN_ID,
        }),
      );
    },
    [submit, writeContractAsync],
  );

  return {
    phase: receiptError ? ("error" as const) : phase,
    hash,
    error: receiptError ?? error,
    claimNft,
    claimCommunity,
    reset,
    receipt,
  };
}
