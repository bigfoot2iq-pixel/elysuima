"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
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
  parseEventLogs,
  zeroAddress,
  type Hash,
} from "viem";
import {
  useAccount,
  useBalance,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  erc721TransferAbi,
  elyziumaNftReadAbi,
  launchpadReadAbi,
  launchpadMintAbi,
  seaDropAbi,
} from "@/lib/launchpad/abis";
import { getMintRequiredBalance } from "@/lib/launchpad/balance";
import { getPerWalletLimit, getUnitPrice } from "@/lib/launchpad/drop";
import { getDropStatus, getSupplyState } from "@/lib/launchpad/status";
import {
  SEADROP_FEE_RECIPIENT,
  type ContractInspection,
  type PublicLaunchpadConfig,
} from "@/lib/launchpad/types";
import {
  explorerAddressFor,
  explorerTxFor,
  getElysiumChain,
} from "@/lib/chains";
import { formatAmount, formatCountdown, shortAddress } from "@/lib/format";
import { COLLECTION_COVER } from "@/lib/mascots";
import { cn } from "@/lib/utils";
import { MintBalanceCheck } from "./mint-balance-check";
import { MintSuccessModal } from "./mint-success-modal";

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
  onMintConfirmed,
  onScheduleReached,
}: {
  config: PublicLaunchpadConfig;
  inspection?: ContractInspection;
  now: number;
  /** Lets the page move the shared supply counter the moment a mint lands. */
  onMintConfirmed?: (quantity: number) => void;
  /** Fires once when the admin schedule reaches its start time. */
  onScheduleReached?: () => void;
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
  const [mintSuccessOpen, setMintSuccessOpen] = useState(false);
  // The RPC can lag behind a confirmed mint, so the wallet counter keeps the
  // fresh total as a floor until the chain catches up. It is keyed by wallet so
  // switching accounts never carries another wallet's mints over.
  const [walletMint, setWalletMint] = useState<{
    wallet: string;
    minted: number;
    at: number;
  } | null>(null);

  // The launch schedule only gates the mint button. A local one-second clock
  // keeps the countdown exact while the page keeps its coarse clock.
  const scheduleTarget = config.startAt > 0 ? config.startAt : null;
  const [scheduleNow, setScheduleNow] = useState(() =>
    Math.floor(Date.now() / 1_000),
  );
  const scheduleHandled = useRef(false);

  useEffect(() => {
    if (!scheduleTarget) {
      scheduleHandled.current = true;
      return;
    }

    const tick = () => {
      const current = Math.floor(Date.now() / 1_000);
      setScheduleNow(current);
      if (current >= scheduleTarget && !scheduleHandled.current) {
        scheduleHandled.current = true;
        onScheduleReached?.();
      }
    };

    // A schedule that already started is not a transition, so it must not
    // notify the page again, and it does not need a live clock.
    if (Math.floor(Date.now() / 1_000) >= scheduleTarget) {
      scheduleHandled.current = true;
      return;
    }

    scheduleHandled.current = false;
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [scheduleTarget, onScheduleReached]);

  const scheduleRemaining =
    scheduleTarget && scheduleNow < scheduleTarget
      ? scheduleTarget - scheduleNow
      : 0;
  const scheduled = scheduleRemaining > 0;

  const collection =
    config.collectionAddress && isAddress(config.collectionAddress)
      ? getAddress(config.collectionAddress)
      : undefined;

  // The admin console can turn the pre-mint balance guard off. Treat a missing
  // field from an older config as enabled.
  const balanceCheckEnabled = config.mintBalanceCheck !== false;

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

  // The mint check reads the native balance on the mint chain, not whichever
  // chain the wallet happens to be on, so the requirement is accurate before
  // the wallet switches networks.
  const nativeBalance = useBalance({
    address,
    chainId: config.chainId,
    query: {
      enabled: Boolean(address) && balanceCheckEnabled,
      refetchInterval: 20_000,
      refetchOnWindowFocus: true,
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

  // The confirmed mint stays highlighted until the next mint starts.
  const justMinted = Boolean(hash) && receipt.isSuccess;

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

  const chainMintedByWallet =
    mintedByWallet !== undefined ? Number(mintedByWallet) : undefined;

  const walletFloor =
    walletMint &&
    address &&
    walletMint.wallet === address.toLowerCase() &&
    now - walletMint.at < 180
      ? walletMint.minted
      : null;

  const walletMinted = Math.max(
    chainMintedByWallet ?? 0,
    walletFloor ?? 0,
  );

  const walletLeft = Math.max(0, perWalletLimit - walletMinted);

  const walletProgress =
    perWalletLimit > 0
      ? Math.min(100, (walletMinted / perWalletLimit) * 100)
      : 0;

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

  const nativeCurrency = config.chain.nativeCurrency;
  const requiredBalance = getMintRequiredBalance(
    nativeCurrency.symbol,
    total,
    nativeCurrency.decimals,
  );
  const isTestnet = getElysiumChain(config.chainId).testnet;
  const totalLabel =
    total === 0n
      ? "Free"
      : `${formatAmount(total, nativeCurrency.decimals, 4)} ${nativeCurrency.symbol}`;

  const minted = Number(totalSupply ?? 0n);
  const cap = maxSupply ? Number(maxSupply) : 0;
  const progress = cap > 0 ? Math.min(100, (minted / cap) * 100) : null;

  // ERC-721 transfers in the receipt tell us which tokens this wallet received,
  // so the confirmation can name them instead of only counting them.
  const mintedTokenIds = useMemo(() => {
    const logs = receipt.data?.logs;
    if (!logs || !collection || !address) return [] as bigint[];
    try {
      const transfers = parseEventLogs({
        abi: erc721TransferAbi,
        logs,
        eventName: "Transfer",
        strict: false,
      });
      const ids: bigint[] = [];
      for (const log of transfers) {
        if (log.address.toLowerCase() !== collection.toLowerCase()) continue;
        const args = log.args;
        if (!args) continue;
        if (args.from !== zeroAddress) continue;
        if (args.to?.toLowerCase() !== address.toLowerCase()) continue;
        if (typeof args.tokenId !== "bigint") continue;
        ids.push(args.tokenId);
      }
      return ids;
    } catch {
      return [] as bigint[];
    }
  }, [receipt.data?.logs, collection, address]);

  const mintedTokenLabel = useMemo(() => {
    if (mintedTokenIds.length === 0) return undefined;
    let first = mintedTokenIds[0];
    let last = mintedTokenIds[0];
    for (const id of mintedTokenIds) {
      if (id < first) first = id;
      if (id > last) last = id;
    }
    return first === last ? `#${first}` : `#${first}–#${last}`;
  }, [mintedTokenIds]);

  // The success modal shows one piece of artwork. Multi-mints display the
  // lowest token id so the image stays stable across re-renders.
  const firstMintedTokenId = useMemo(() => {
    if (mintedTokenIds.length === 0) return undefined;
    return mintedTokenIds.reduce((lowest, id) => (id < lowest ? id : lowest));
  }, [mintedTokenIds]);

  const closeMintSuccess = useCallback(() => {
    setMintSuccessOpen(false);
  }, []);

  const isLive = status.label === "Live";
  const mintable =
    Boolean(collection) &&
    config.enabled &&
    isLive &&
    !scheduled &&
    methodReady &&
    maxQuantity > 0;

  const nativeBalanceValue = nativeBalance.data?.value;
  const balanceKnown = nativeBalanceValue !== undefined;
  const balanceUnavailable =
    balanceCheckEnabled &&
    Boolean(address) &&
    !balanceKnown &&
    nativeBalance.isError;
  const balanceChecking =
    balanceCheckEnabled &&
    Boolean(address) &&
    !balanceKnown &&
    !balanceUnavailable;
  const insufficientBalance =
    balanceCheckEnabled &&
    nativeBalanceValue !== undefined &&
    nativeBalanceValue < requiredBalance;

  const canMint =
    mintable &&
    (!balanceCheckEnabled || (balanceKnown && !insufficientBalance));

  const wrongChain = Boolean(address) && walletChainId !== config.chainId;
  const busyOrConfirming = busy || receipt.isLoading;
  const retryBalance =
    Boolean(address) && !wrongChain && mintable && balanceUnavailable;

  const emptyDrop = !collection;
  const opensIn = (() => {
    if (scheduled) return formatCountdown(scheduleRemaining);
    if (inspection?.seaDrop?.startTime && inspection.seaDrop.startTime > now) {
      return formatCountdown(inspection.seaDrop.startTime - now);
    }
    return undefined;
  })();

  const handledSuccess = useRef<Hash | undefined>(undefined);
  const handledError = useRef<Hash | undefined>(undefined);
  const refetchMintStats = mintStats.refetch;
  const refetchBalance = balance.refetch;
  const refetchNativeBalance = nativeBalance.refetch;
  const refetchPublicMinted = publicMinted.refetch;

  useEffect(() => {
    if (!hash || !receipt.isSuccess || handledSuccess.current === hash) return;
    handledSuccess.current = hash;
    setBusy(false);
    setQuantity(1);
    setWalletMint((current) => {
      const wallet = address?.toLowerCase();
      if (!wallet) return current;
      const base =
        current &&
        current.wallet === wallet &&
        now - current.at < 180
          ? current.minted
          : (chainMintedByWallet ?? 0);
      return {
        wallet,
        minted: Math.max(chainMintedByWallet ?? 0, base) + lastQuantity,
        at: now,
      };
    });
    onMintConfirmed?.(lastQuantity);
    toast.dismiss(hash);
    setMintSuccessOpen(true);
    void refetchMintStats();
    void refetchBalance();
    if (balanceCheckEnabled) void refetchNativeBalance();
    if (drop) void refetchPublicMinted();
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "launchpad-contract",
    });
  }, [
    hash,
    receipt.isSuccess,
    lastQuantity,
    chainMintedByWallet,
    address,
    now,
    drop,
    onMintConfirmed,
    refetchPublicMinted,
    queryClient,
    refetchBalance,
    refetchMintStats,
    refetchNativeBalance,
    balanceCheckEnabled,
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
    setMintSuccessOpen(false);
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
    if (scheduled) return;

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

    if (balanceCheckEnabled && balanceUnavailable) {
      void nativeBalance.refetch();
      return;
    }

    if (
      balanceCheckEnabled &&
      (balanceChecking || insufficientBalance)
    ) {
      return;
    }

    if (!canMint || busyOrConfirming) return;
    await submitMint();
  }

  const buttonLabel = (() => {
    if (scheduled)
      return opensIn ? `Mint opens in ${opensIn}` : "Mint scheduled";
    if (!address) return "Connect wallet";
    if (wrongChain) return "Switch to Elysium";
    if (emptyDrop) return "Mint not configured";
    if (!config.enabled) return "Mint paused";
    if (status.label === "Scheduled")
      return opensIn ? `Mint opens in ${opensIn}` : "Mint scheduled";
    if (status.label === "Ended") return "Mint ended";
    if (status.label === "Sold out") return "Sold out";
    if (status.label === "Closed") return "Mint closed";
    if (!methodReady) return "Mint method unavailable";
    if (maxQuantity === 0) return "Wallet limit reached";
    if (receipt.isLoading) return "Confirming on Elysium…";
    if (busy) return "Confirm in wallet…";
    if (balanceChecking) return "Checking wallet…";
    if (balanceUnavailable) return "Retry wallet check";
    if (insufficientBalance) return `Insufficient ${nativeCurrency.symbol}`;
    return `Mint ${effectiveQuantity} · ${totalLabel}`;
  })();

  const buttonDisabled =
    scheduled ||
    busyOrConfirming ||
    (Boolean(address) && !wrongChain && !canMint && !retryBalance) ||
    (Boolean(address) && !wrongChain && emptyDrop);

  return (
    <div className="glass flex flex-col rounded-[28px] p-4 sm:p-5 lg:sticky lg:top-[92px] lg:self-start">
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
            {unitPrice === 0n
              ? "Free"
              : `${formatAmount(unitPrice, nativeCurrency.decimals, 4)} ${nativeCurrency.symbol}`}
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
            {address
              ? `${walletLeft} left / wallet`
              : `Max ${perWalletLimit} / wallet`}
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
          {total === 0n
            ? "Free"
            : formatAmount(total, nativeCurrency.decimals, 4)}
          {total === 0n ? null : (
            <span className="text-[10px] uppercase tracking-[0.12em] text-paper-mute">
              {nativeCurrency.symbol}
            </span>
          )}
        </span>
      </div>

      {balanceCheckEnabled ? (
        <MintBalanceCheck
          address={address}
          balance={nativeBalanceValue}
          required={requiredBalance}
          symbol={nativeCurrency.symbol}
          decimals={nativeCurrency.decimals}
          checking={balanceChecking}
          unavailable={balanceUnavailable}
          isTestnet={isTestnet}
        />
      ) : null}

      <button
        type="button"
        onClick={handlePrimary}
        disabled={buttonDisabled}
        className={cn(
          "btn-primary mt-3.5 w-full",
          wrongChain && "bg-none bg-warn text-ink",
          scheduled && "is-countdown tabular",
        )}
      >
        {scheduled ? (
          <CalendarClock className="size-4" />
        ) : busyOrConfirming || balanceChecking ? (
          <Loader2 className="size-4 animate-spin" />
        ) : wrongChain || balanceUnavailable || insufficientBalance ? (
          <AlertTriangle className="size-4" />
        ) : (
          <Wallet className="size-4" />
        )}
        {buttonLabel}
      </button>

      {wrongChain ? (
        <p className="mt-2.5 text-center text-[10px] leading-5 text-warn/90">
          Your wallet is on another network. Switch to {config.chain.name} (
          {config.chain.id}) before minting.
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
              className="group flex items-center gap-3 rounded-xl border border-mint/25 bg-mint/[0.07] p-2.5 transition hover:border-mint/40 hover:bg-mint/[0.1]"
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-mint/20 bg-ink">
                <Image
                  src={COLLECTION_COVER.image}
                  alt="Elyziuma NFT artwork"
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-mint">
                  <Check className="size-3.5" />
                  Mint confirmed
                </span>
                <span className="mt-0.5 block text-[10px] leading-4 text-paper-dim">
                  {lastQuantity} NFT{lastQuantity === 1 ? "" : "s"} added to your
                  wallet
                  {mintedTokenLabel ? ` · Token ${mintedTokenLabel}` : ""}.
                </span>
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 text-mint/70 transition group-hover:text-mint" />
            </a>
          ) : null}

          {receipt.isError && receipt.error ? (
            <div className="rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-3 text-[10px] leading-5 text-danger">
              {txError(receipt.error)}
            </div>
          ) : null}
        </div>
      ) : null}

      {progress !== null || address ? (
        <div className="mt-3.5 rounded-xl border border-paper/[0.08] bg-paper/[0.02] p-3">
          {progress !== null ? (
            <>
              <div className="flex items-center justify-between font-mono text-[11px] text-paper-mute">
                <span className="inline-flex items-center gap-1.5">
                  Minted
                  {justMinted ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full border border-mint/30 bg-mint/10 px-1.5 py-0.5 text-[9px] font-semibold text-mint">
                      <Plus className="size-2.5" />
                      {lastQuantity}
                    </span>
                  ) : null}
                </span>
                <span>
                  <span className="text-paper">
                    {minted.toLocaleString("en-US")}
                  </span>
                  {maxSupply
                    ? ` / ${Number(maxSupply).toLocaleString("en-US")}`
                    : ""}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Collection mint progress"
                aria-valuemin={0}
                aria-valuemax={cap}
                aria-valuenow={minted}
                className={cn(
                  "mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper/[0.06]",
                  justMinted &&
                    "shadow-[0_0_14px_rgba(125,240,196,0.45)] ring-1 ring-mint/25",
                )}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-mint transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.max(progress, 1.5)}%` }}
                />
              </div>
            </>
          ) : null}

          {address ? (
            <div className={progress !== null ? "mt-2.5" : undefined}>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-paper-mute">Your mints</span>
                <span
                  className={cn(
                    "tabular",
                    walletMinted > 0 ? "text-mint" : "text-paper-dim",
                  )}
                >
                  {walletMinted} / {perWalletLimit}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Your mints"
                aria-valuemin={0}
                aria-valuemax={perWalletLimit}
                aria-valuenow={walletMinted}
                className="mt-1 h-1 w-full overflow-hidden rounded-full bg-paper/[0.06]"
              >
                <div
                  className="h-full rounded-full bg-mint/80 transition-[width] duration-700 ease-out"
                  style={{ width: `${walletProgress}%` }}
                />
              </div>
            </div>
          ) : null}
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

      <MintSuccessModal
        open={mintSuccessOpen}
        tokenId={firstMintedTokenId}
        quantity={lastQuantity}
        onClose={closeMintSuccess}
      />
    </div>
  );
}