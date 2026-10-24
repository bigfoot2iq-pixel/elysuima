"use client";

import { useEffect, useRef, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Loader2,
  Minus,
  Plus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  BaseError,
  getAddress,
  isAddress,
  zeroAddress,
  type Hash,
} from "viem";
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  elyziumaNftReadAbi,
  launchpadReadAbi,
  launchpadMintAbi,
  seaDropAbi,
} from "@/lib/launchpad/abis";
import { getPerWalletLimit, getUnitPrice } from "@/lib/launchpad/drop";
import { getDropStatus, getSupplyState } from "@/lib/launchpad/status";
import {
  SEADROP_FEE_RECIPIENT,
  type ContractInspection,
  type PublicLaunchpadConfig,
} from "@/lib/launchpad/types";
import { explorerAddressFor, explorerTxFor } from "@/lib/chains";
import { formatAmount, formatCountdown, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  mint: "border-mint/30 bg-mint/10 text-mint",
  brand: "border-brand/30 bg-brand/10 text-brand",
  warn: "border-warn/30 bg-warn/10 text-warn",
  danger: "border-danger/30 bg-danger/10 text-danger",
  muted: "border-paper/10 bg-paper/[0.04] text-paper-dim",
} as const;

function txError(error: unknown) {
  if (error instanceof BaseError) return error.shortMessage;
  if (error instanceof Error) return error.message.split("\n")[0];
  return "The transaction could not be submitted.";
}

export function MintCard({
  config,
  inspection,
  now,
}: {
  config: PublicLaunchpadConfig;
  inspection?: ContractInspection;
  now: number;
}) {
  const { address, chainId: walletChainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState(1);
  const [lastQuantity, setLastQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<Hash>();

  const collection =
    config.collectionAddress && isAddress(config.collectionAddress)
      ? getAddress(config.collectionAddress)
      : undefined;

  const mintStats = useReadContract({
    address: collection,
    abi: launchpadReadAbi,
    functionName: "getMintStats",
    args: [address ?? zeroAddress],
    chainId: config.chainId,
    query: {
      enabled: Boolean(address && collection),
      refetchInterval: 20_000,
      retry: false,
    },
  });

  const balance = useReadContract({
    address: collection,
    abi: launchpadReadAbi,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
    chainId: config.chainId,
    query: {
      enabled: Boolean(address && collection),
      refetchInterval: 20_000,
      retry: false,
    },
  });

  // The Elyziuma collection tracks public mints per wallet, so the allowance
  // left for this wallet comes from that counter.
  const drop = inspection?.elyziumaDrop;

  const publicMinted = useReadContract({
    address: collection,
    abi: elyziumaNftReadAbi,
    functionName: "minted",
    args: [address ?? zeroAddress],
    chainId: config.chainId,
    query: {
      enabled: Boolean(address && collection && drop),
      refetchInterval: 20_000,
      retry: false,
    },
  });

  const receipt = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  const status = getDropStatus(config, inspection, now);
  const { totalSupply, maxSupply, remaining } = getSupplyState(
    config,
    inspection,
  );

  const unitPrice = getUnitPrice(config, inspection);
  const perWalletLimit = getPerWalletLimit(config, inspection);

  const mintedByWallet = drop
    ? publicMinted.data
    : (mintStats.data?.[0] ?? balance.data ?? undefined);

  const walletLeft =
    mintedByWallet !== undefined
      ? Math.max(0, perWalletLimit - Number(mintedByWallet))
      : perWalletLimit;

  const supplyLeft =
    remaining !== undefined
      ? Number(
          remaining > BigInt(Number.MAX_SAFE_INTEGER)
            ? BigInt(Number.MAX_SAFE_INTEGER)
            : remaining,
        )
      : undefined;

  // The Elyziuma contract decides which entry point is live, so the launchpad
  // follows the phase. A method pinned to a different family (SeaDrop,
  // Thirdweb, ...) is still respected.
  const followsElyziumaPhase =
    Boolean(drop) &&
    (config.mintMethod === "auto" || config.mintMethod === "public-mint-amount");

  const resolvedMethod = followsElyziumaPhase
    ? ("public-mint-amount" as const)
    : config.mintMethod === "auto"
      ? inspection?.detectedMethod
      : config.mintMethod;
  const methodReady =
    resolvedMethod === "seadrop"
      ? Boolean(inspection?.seaDrop)
      : Boolean(resolvedMethod);
  const singleMintMethod =
    resolvedMethod === "mint-to-address" ||
    resolvedMethod === "safe-mint-address";

  const maxQuantity = Math.max(
    0,
    Math.min(
      walletLeft,
      supplyLeft ?? walletLeft,
      singleMintMethod ? 1 : Number.MAX_SAFE_INTEGER,
    ),
  );
  const effectiveQuantity = Math.min(
    Math.max(1, quantity),
    Math.max(1, maxQuantity),
  );
  const total = unitPrice * BigInt(effectiveQuantity);

  const minted = Number(totalSupply ?? 0n);
  const cap = maxSupply ? Number(maxSupply) : 0;
  const progress = cap > 0 ? Math.min(100, (minted / cap) * 100) : null;

  const isLive = status.label === "Live";
  const canMint =
    Boolean(collection) &&
    config.enabled &&
    isLive &&
    methodReady &&
    maxQuantity > 0;

  const wrongChain = Boolean(address) && walletChainId !== config.chainId;
  const busyOrConfirming = busy || receipt.isLoading;

  const emptyDrop = !collection;
  const opensIn = (() => {
    if (inspection?.seaDrop?.startTime && inspection.seaDrop.startTime > now) {
      return formatCountdown(inspection.seaDrop.startTime - now);
    }
    return undefined;
  })();

  const handledSuccess = useRef<Hash | undefined>(undefined);
  const handledError = useRef<Hash | undefined>(undefined);
  const refetchMintStats = mintStats.refetch;
  const refetchBalance = balance.refetch;

  useEffect(() => {
    if (!hash || !receipt.isSuccess || handledSuccess.current === hash) return;
    handledSuccess.current = hash;
    setBusy(false);
    setQuantity(1);
    toast.success("Mint confirmed", {
      id: hash,
      description: `${lastQuantity} NFT${lastQuantity === 1 ? "" : "s"} minted on Elysium.`,
    });
    void refetchMintStats();
    void refetchBalance();
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "launchpad-contract",
    });
  }, [
    hash,
    receipt.isSuccess,
    lastQuantity,
    queryClient,
    refetchBalance,
    refetchMintStats,
  ]);

  useEffect(() => {
    if (!hash || !receipt.isError || !receipt.error || handledError.current === hash)
      return;
    handledError.current = hash;
    setBusy(false);
    toast.error("Mint failed", {
      id: hash,
      description: txError(receipt.error),
    });
  }, [hash, receipt.isError, receipt.error]);

  function changeQuantity(delta: number) {
    setQuantity(
      Math.min(
        Math.max(1, effectiveQuantity + delta),
        Math.max(1, maxQuantity),
      ),
    );
  }

  async function submitMint() {
    const wallet = address;
    if (!wallet || !collection || !resolvedMethod) return;

    setBusy(true);
    setHash(undefined);
    setLastQuantity(effectiveQuantity);

    try {
      const amount = BigInt(effectiveQuantity);
      let txHash: Hash;

      switch (resolvedMethod) {
        case "seadrop": {
          const drop = inspection?.seaDrop;
          if (!drop) throw new Error("The SeaDrop public drop is unavailable.");
          const feeRecipient =
            drop.feeRecipient || config.feeRecipient || SEADROP_FEE_RECIPIENT;
          if (!isAddress(feeRecipient)) {
            throw new Error("The SeaDrop fee recipient is not configured.");
          }

          txHash = await writeContractAsync({
            address: getAddress(drop.address),
            abi: seaDropAbi,
            functionName: "mintPublic",
            args: [collection, getAddress(feeRecipient), zeroAddress, amount],
            value: total,
          });
          break;
        }
        case "mint-address-amount":
          txHash = await writeContractAsync({
            address: collection,
            abi: launchpadMintAbi,
            functionName: "mint",
            args: [wallet, amount],
            value: total,
          });
          break;
        case "mint-amount":
          txHash = await writeContractAsync({
            address: collection,
            abi: launchpadMintAbi,
            functionName: "mint",
            args: [amount],
            value: total,
          });
          break;
        case "public-mint-amount":
          txHash = await writeContractAsync({
            address: collection,
            abi: launchpadMintAbi,
            functionName: "publicMint",
            args: [amount],
            value: total,
          });
          break;
        case "mint-public-amount":
          txHash = await writeContractAsync({
            address: collection,
            abi: launchpadMintAbi,
            functionName: "mintPublic",
            args: [amount],
            value: total,
          });
          break;
        case "claim-address-amount":
          txHash = await writeContractAsync({
            address: collection,
            abi: launchpadMintAbi,
            functionName: "claim",
            args: [wallet, amount],
            value: total,
          });
          break;
        case "mint-to-address":
          txHash = await writeContractAsync({
            address: collection,
            abi: launchpadMintAbi,
            functionName: "mintTo",
            args: [wallet],
            value: total,
          });
          break;
        case "safe-mint-address":
          txHash = await writeContractAsync({
            address: collection,
            abi: launchpadMintAbi,
            functionName: "safeMint",
            args: [wallet],
            value: total,
          });
          break;
        default:
          throw new Error("Choose a mint method in the admin console.");
      }

      setHash(txHash);
      toast.loading("Mint submitted", {
        id: txHash,
        description: "Waiting for Elysium to confirm the transaction…",
      });
    } catch (error) {
      setBusy(false);
      toast.error("Mint could not be submitted", {
        description: txError(error),
      });
    }
  }

  async function handlePrimary() {
    if (!address) {
      openConnectModal?.();
      return;
    }

    if (wrongChain) {
      try {
        await switchChainAsync({ chainId: config.chainId });
      } catch (error) {
        toast.error("Switch to Elysium", { description: txError(error) });
      }
      return;
    }

    if (!canMint || busyOrConfirming) return;
    await submitMint();
  }

  const buttonLabel = (() => {
    if (!address) return "Connect wallet";
    if (wrongChain) return "Switch to Elysium";
    if (emptyDrop) return "Mint not configured";
    if (!config.enabled) return "Mint paused";
    if (status.label === "Scheduled")
      return opensIn ? `Opens in ${opensIn}` : "Mint scheduled";
    if (status.label === "Ended") return "Mint ended";
    if (status.label === "Sold out") return "Sold out";
    if (status.label === "Closed") return "Mint closed";
    if (!methodReady) return "Mint method unavailable";
    if (maxQuantity === 0) return "Wallet limit reached";
    if (receipt.isLoading) return "Confirming on Elysium…";
    if (busy) return "Confirm in wallet…";
    return `Mint ${effectiveQuantity} · ${
      total === 0n ? "Free" : `${formatAmount(total, 18, 4)} HYPE`
    }`;
  })();

  const buttonDisabled =
    busyOrConfirming ||
    Boolean(address && !wrongChain && !canMint) ||
    (Boolean(address) && !wrongChain && emptyDrop);

  return (
    <div className="glass flex flex-col rounded-2xl p-4 lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.18em] text-paper-mute">
            Mint phase
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-paper">Mint</h2>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em]",
            TONE_STYLES[status.tone],
          )}
        >
          {status.tone === "mint" ? (
            <span className="live-dot" />
          ) : (
            <span className="size-1.5 rounded-full bg-current" />
          )}
          {status.label}
        </span>
      </div>

      <div className="mt-3.5 flex items-end justify-between rounded-xl border border-paper/[0.08] bg-paper/[0.02] px-3.5 py-2.5">
        <div>
          <p className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
            Price
          </p>
          <p className="tabular mt-0.5 font-mono text-lg font-semibold text-paper">
            {unitPrice === 0n ? "Free" : `${formatAmount(unitPrice, 18, 4)} HYPE`}
          </p>
        </div>
        <p className="font-mono text-[11px] text-paper-mute">per NFT</p>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
            Quantity
          </p>
          <p className="font-mono text-[11px] text-paper-mute">
            Max {perWalletLimit} / wallet
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl border border-paper/[0.08] bg-paper/[0.02] p-1.5">
          <button
            type="button"
            onClick={() => changeQuantity(-1)}
            disabled={effectiveQuantity <= 1}
            aria-label="Decrease quantity"
            className="btn-ghost size-9 p-0 disabled:opacity-30"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="tabular font-mono text-xl font-semibold text-paper">
            {effectiveQuantity}
          </span>
          <button
            type="button"
            onClick={() => changeQuantity(1)}
            disabled={effectiveQuantity >= maxQuantity}
            aria-label="Increase quantity"
            className="btn-ghost size-9 p-0 disabled:opacity-30"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-paper/[0.08] bg-paper/[0.02] px-3.5 py-2.5 font-mono text-[13px]">
        <span className="text-paper-mute">Total</span>
        <span className="tabular flex items-center gap-2 text-sm font-semibold text-paper">
          {total === 0n ? "Free" : formatAmount(total, 18, 4)}
          {total === 0n ? null : (
            <span className="text-[10px] uppercase tracking-[0.12em] text-paper-mute">
              HYPE
            </span>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={handlePrimary}
        disabled={buttonDisabled}
        className={cn(
          "btn-primary mt-3.5 w-full",
          wrongChain && "bg-none bg-warn text-ink",
        )}
      >
        {busyOrConfirming ? (
          <Loader2 className="size-4 animate-spin" />
        ) : wrongChain ? (
          <AlertTriangle className="size-4" />
        ) : (
          <Wallet className="size-4" />
        )}
        {buttonLabel}
      </button>

      {wrongChain ? (
        <p className="mt-2.5 text-center text-[10px] leading-5 text-warn/90">
          Your wallet is on another network. Switch to Elysium (99901) before
          minting.
        </p>
      ) : null}

      {hash ? (
        <div className="mt-3 space-y-2">
          {receipt.isLoading ? (
            <a
              href={explorerTxFor(config.chainId, hash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/[0.06] px-3.5 py-3 text-[10px] text-brand"
            >
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                Waiting for confirmation…
              </span>
              <ArrowUpRight className="size-3 shrink-0" />
            </a>
          ) : null}

          {receipt.isSuccess ? (
            <a
              href={explorerTxFor(config.chainId, hash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-mint/25 bg-mint/[0.07] px-3.5 py-3 text-[10px] text-mint"
            >
              <span className="inline-flex items-center gap-2">
                <Check className="size-3.5" />
                Minted {lastQuantity} NFT{lastQuantity === 1 ? "" : "s"}.
              </span>
              <ArrowUpRight className="size-3 shrink-0" />
            </a>
          ) : null}

          {receipt.isError && receipt.error ? (
            <div className="rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-3 text-[10px] leading-5 text-danger">
              {txError(receipt.error)}
            </div>
          ) : null}
        </div>
      ) : null}

      {progress !== null ? (
        <div className="mt-3.5 rounded-xl border border-paper/[0.08] bg-paper/[0.02] p-3">
          <div className="flex items-center justify-between font-mono text-[11px] text-paper-mute">
            <span>Minted</span>
            <span>
              <span className="text-paper">{minted.toLocaleString("en-US")}</span>
              {maxSupply
                ? ` / ${Number(maxSupply).toLocaleString("en-US")}`
                : ""}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-mint"
              style={{ width: `${Math.max(progress, 1.5)}%` }}
            />
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-center text-[11px] leading-5 text-paper-mute">
        {status.detail}
      </p>

      {collection ? (
        <a
          href={explorerAddressFor(config.chainId, collection)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center justify-center gap-1.5 border-t border-paper/[0.07] pt-3 font-mono text-[10px] text-paper-dim transition hover:text-brand"
        >
          {shortAddress(collection, 5)} on ElysScan
          <ArrowUpRight className="size-3" />
        </a>
      ) : null}
    </div>
  );
}