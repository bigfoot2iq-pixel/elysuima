"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useReadContracts,
  useSwitchChain,
} from "wagmi";
import {
  Check,
  Clock3,
  ExternalLink,
  Fuel,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { claimAbi, tokenAbi } from "@/lib/abis";
import { ELIGIBILITY_CHAINS, elysium } from "@/lib/chains";
import {
  CLAIM_ADDRESS,
  IS_CONFIGURED,
  LINKS,
  SITE_URL,
  TOKEN_ADDRESS,
  TOKEN_FALLBACK,
  explorerTx,
} from "@/lib/config";
import { formatAmount, formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClaimFlow } from "@/hooks/use-claim-flow";
import { useEligibility } from "@/hooks/use-eligibility";
import { useNow } from "@/hooks/use-now";
import { ChainIcon } from "./chain-icon";
import { CountdownRing } from "./countdown-ring";
import { TokenMark } from "./token-mark";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const COOLDOWN_SECONDS = 86_400;

function StatusBadge({
  tone,
  children,
}: {
  tone: "mint" | "warn" | "danger" | "muted" | "brand";
  children: ReactNode;
}) {
  const styles = {
    mint: "border-mint/30 bg-mint/10 text-mint",
    warn: "border-warn/30 bg-warn/10 text-warn",
    danger: "border-danger/30 bg-danger/10 text-danger",
    muted: "border-paper/10 bg-paper/[0.04] text-paper-dim",
    brand: "border-brand/30 bg-brand/10 text-brand",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em]",
        styles[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function ClaimCard() {
  const { address, chainId, connector } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const now = useNow();
  const [addedToken, setAddedToken] = useState(false);

  const eligibility = useEligibility(address);

  const { data, refetch } = useReadContracts({
    contracts: [
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "dailyAmount",
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "paused",
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "lastClaim",
        args: [address ?? ZERO_ADDRESS],
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [address ?? ZERO_ADDRESS],
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "symbol",
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "decimals",
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [CLAIM_ADDRESS],
      },
    ],
    query: {
      enabled: IS_CONFIGURED,
      refetchInterval: 15_000,
    },
    allowFailure: true,
  });

  const [
    dailyAmountResult,
    pausedResult,
    lastClaimResult,
    userBalanceResult,
    symbolResult,
    decimalsResult,
    faucetBalanceResult,
  ] = data ?? [];

  const dailyAmount =
    dailyAmountResult?.status === "success"
      ? (dailyAmountResult.result as bigint)
      : undefined;
  const paused =
    pausedResult?.status === "success"
      ? (pausedResult.result as boolean)
      : false;
  const lastClaim =
    lastClaimResult?.status === "success"
      ? (lastClaimResult.result as bigint)
      : undefined;
  const userBalance =
    userBalanceResult?.status === "success"
      ? (userBalanceResult.result as bigint)
      : undefined;
  const symbol =
    symbolResult?.status === "success"
      ? (symbolResult.result as string)
      : TOKEN_FALLBACK.symbol;
  const decimals =
    decimalsResult?.status === "success"
      ? Number(decimalsResult.result)
      : TOKEN_FALLBACK.decimals;
  const faucetBalance =
    faucetBalanceResult?.status === "success"
      ? (faucetBalanceResult.result as bigint)
      : undefined;

  const { phase, hash, error: claimError, claim } = useClaimFlow({
    onSuccess: () => {
      void refetch();
      void eligibility.refetch();
    },
  });

  const hasClock = now > 0;
  const nextClaimAt =
    lastClaim && lastClaim > 0n ? Number(lastClaim) + COOLDOWN_SECONDS : 0;
  const remaining =
    nextClaimAt > 0 && hasClock ? Math.max(0, nextClaimAt - now) : 0;
  const ready =
    lastClaim !== undefined &&
    (lastClaim === 0n || (hasClock && remaining === 0));

  const dataReady =
    dailyAmount !== undefined &&
    lastClaim !== undefined &&
    faucetBalance !== undefined;

  const eligible = eligibility.data?.eligible ?? false;
  const checking = eligibility.isLoading && !eligibility.data;
  const busy =
    phase === "authorizing" || phase === "submitting" || phase === "pending";
  const faucetEmpty = faucetBalance === 0n;
  const finalSweep =
    dailyAmount !== undefined &&
    faucetBalance !== undefined &&
    faucetBalance > 0n &&
    faucetBalance < dailyAmount;

  const displayAmount =
    dailyAmount && dailyAmount > 0n
      ? formatAmount(dailyAmount, decimals, 0)
      : "100";

  const summary = useMemo(() => {
    if (!address) return "Connect a wallet to check all five chains.";
    if (checking)
      return "Checking Hyperliquid, HyperEVM, Ethereum, Base, and Ink…";
    if (eligibility.isError) return "Balance check unavailable. Tap to retry.";
    if (eligibility.data?.eligible)
      return `Eligible via ${eligibility.data.bestChain}.`;
    if (eligibility.data?.allUnavailable)
      return "Balance networks are unreachable right now.";
    if (eligibility.data) return "No qualifying balance found yet.";
    return "Waiting for a balance check…";
  }, [address, checking, eligibility.data, eligibility.isError]);

  const buttonLabel = (() => {
    if (!IS_CONFIGURED) return "Claim not live yet";
    if (!address) return "Connect wallet";
    if (chainId !== elysium.id) return "Switch to Elysium";
    if (busy) {
      if (phase === "authorizing") return "Authorizing claim…";
      if (phase === "submitting") return "Confirm in wallet…";
      return "Claiming…";
    }
    if (phase === "success") return "Claimed";
    if (paused) return "Claims paused";
    if (checking) return "Checking eligibility…";
    if (eligibility.isError) return "Retry eligibility";
    if (!dataReady) return "Loading claim…";
    if (!eligible) return "Not eligible";
    if (faucetEmpty) return "Faucet refilling";
    if (!ready) return `Claim in ${formatCountdown(remaining)}`;
    if (finalSweep) {
      return `Claim final ${formatAmount(faucetBalance ?? 0n, decimals, 2)} ${symbol}`;
    }
    return `Claim ${displayAmount} ${symbol}`;
  })();

  const disabled =
    !IS_CONFIGURED ||
    busy ||
    phase === "success" ||
    paused ||
    checking ||
    !dataReady ||
    faucetEmpty ||
    (Boolean(address) &&
      chainId === elysium.id &&
      eligible &&
      !ready);

  async function handlePrimary() {
    if (!IS_CONFIGURED) return;

    if (!address) {
      openConnectModal?.();
      return;
    }

    if (chainId !== elysium.id) {
      try {
        await switchChainAsync({ chainId: elysium.id });
      } catch {
        toast.error("Could not switch network", {
          description: "Add Elysium to your wallet and try again.",
        });
      }
      return;
    }

    if (eligibility.isError) {
      void eligibility.refetch();
      return;
    }

    if (!eligible) {
      document
        .getElementById("eligibility")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!ready || paused || !dataReady || faucetEmpty) return;
    void claim();
  }

  async function addToken() {
    if (!connector || !IS_CONFIGURED || addedToken) return;

    try {
      const provider = (await connector.getProvider()) as {
        request: (args: { method: string; params?: unknown }) => Promise<unknown>;
      };

      await provider.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: TOKEN_ADDRESS,
            symbol,
            decimals,
            image: `${SITE_URL}/token.svg`,
          },
        },
      });

      setAddedToken(true);
      toast.success("ELYZ added to your wallet");
    } catch {
      toast.error("Could not add the token", {
        description: "Your wallet may not support adding tokens automatically.",
      });
    }
  }

  const status = (() => {
    if (!IS_CONFIGURED) return { tone: "muted" as const, label: "Preview" };
    if (paused) return { tone: "danger" as const, label: "Paused" };
    if (phase === "success") return { tone: "mint" as const, label: "Claimed" };
    if (!address) return { tone: "muted" as const, label: "Wallet needed" };
    if (checking) return { tone: "brand" as const, label: "Checking" };
    if (eligibility.isError) return { tone: "warn" as const, label: "Unavailable" };
    if (!eligible) return { tone: "muted" as const, label: "Locked" };
    if (!ready) return { tone: "warn" as const, label: "Cooldown" };
    return { tone: "mint" as const, label: "Open" };
  })();

  return (
    <div className="card-sheen glass relative rounded-[28px] p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <TokenMark size={46} glow />
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-paper-dim">
              Daily claim
            </p>
            <p className="mt-1 text-sm font-semibold text-paper">Elyziuma</p>
          </div>
        </div>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>

      <div className="mt-7 flex items-end gap-3">
        <span className="tabular font-mono text-[62px] font-semibold leading-none tracking-[-0.07em] text-paper sm:text-[72px]">
          {displayAmount}
        </span>
        <span className="mb-1.5 text-xs font-bold tracking-[0.2em] text-brand">
          {symbol}
        </span>
      </div>
      <p className="mt-2 text-sm text-paper-dim">
        per wallet <span className="px-1 text-paper-mute">/</span> every 24 hours
      </p>

      <div className="mt-7 flex items-center justify-between gap-4 rounded-2xl border border-paper/[0.07] bg-ink/35 p-4">
        <CountdownRing
          remaining={hasClock && lastClaim ? remaining : COOLDOWN_SECONDS}
          ready={ready}
          size={112}
        />
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.2em] text-paper-dim">
            {ready ? "Window open" : "Next claim"}
          </p>
          <p className="mt-1 text-sm font-medium leading-5 text-paper">
            {ready ? "You're ready to claim" : "The ring fills every 24 hours"}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-paper-mute">
            {ready
              ? "One claim per wallet. The contract enforces the cooldown."
              : "Your next claim unlocks when the timer reaches zero."}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-paper/[0.07] bg-ink/25 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-brand" />
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-paper-dim">
              Eligibility
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {ELIGIBILITY_CHAINS.map((chain) => {
              const result = eligibility.data?.chains.find(
                (item) => item.key === chain.key,
              );
              return (
                <span
                  key={chain.key}
                  title={
                    result?.error
                      ? `${chain.name}: unavailable`
                      : result
                        ? `${chain.name}: ${result.balanceFormatted} ${chain.nativeSymbol}`
                        : `${chain.name}: waiting`
                  }
                  className={cn(
                    "inline-flex rounded-lg border p-0.5 transition",
                    result?.ok
                      ? "border-mint/30 bg-mint/[0.06]"
                      : result?.error
                        ? "border-warn/25 bg-warn/[0.05]"
                        : "border-paper/[0.07] bg-paper/[0.02] opacity-60",
                  )}
                >
                  <ChainIcon chainKey={chain.key} size={17} />
                </span>
              );
            })}
          </div>
        </div>
        <p
          className={cn(
            "mt-2.5 text-[11px] leading-5",
            eligibility.data?.eligible ? "text-mint" : "text-paper-mute",
            eligibility.isError && "text-warn",
          )}
        >
          {summary}
        </p>
      </div>

      {phase === "success" && hash ? (
        <div className="mt-4 rounded-2xl border border-mint/25 bg-mint/[0.07] p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint/15 text-mint">
              <Check className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-mint">Claim confirmed</p>
              <p className="mt-1 text-[11px] leading-5 text-paper-dim">
                Your daily ELYZ was sent to your wallet.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={explorerTx(hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-mint/25 bg-mint/[0.06] px-3 py-1.5 text-[10px] font-semibold text-mint transition hover:bg-mint/10"
                >
                  View transaction <ExternalLink className="size-3" />
                </a>
                <button
                  type="button"
                  onClick={addToken}
                  disabled={addedToken}
                  className="inline-flex items-center gap-1.5 rounded-full border border-paper/10 px-3 py-1.5 text-[10px] font-semibold text-paper-dim transition hover:border-paper/20 hover:text-paper disabled:opacity-50"
                >
                  <Plus className="size-3" />
                  {addedToken ? "Token added" : "Add to wallet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handlePrimary}
        disabled={disabled}
        aria-busy={busy}
        className="btn-primary mt-5 w-full"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {!address ? <Wallet className="size-4" /> : null}
        {!eligible && address && !checking && !busy && phase !== "success" ? (
          <LockKeyhole className="size-4" />
        ) : null}
        {!ready && eligible && !busy && phase !== "success" ? (
          <Clock3 className="size-4" />
        ) : null}
        {eligibility.isError && address && !busy ? (
          <RefreshCw className="size-4" />
        ) : null}
        {buttonLabel}
      </button>

      {claimError ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-danger"
        >
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {claimError}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-paper-mute">
        <span className="inline-flex items-center gap-1.5">
          <Fuel className="size-3.5" />
          Gas paid in HYPE
        </span>
        <a
          href={LINKS.bridge}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 transition hover:text-paper"
        >
          Bridge HYPE <ExternalLink className="size-3" />
        </a>
      </div>

      {!IS_CONFIGURED ? (
        <p className="mt-3 rounded-xl border border-paper/10 bg-paper/[0.03] px-3 py-2 text-[10px] leading-5 text-paper-mute">
          Claim isn&apos;t live yet. Check back soon.
        </p>
      ) : null}

      <div className="mt-5 hairline" />

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-paper-dim">
            Your balance
          </p>
          <p className="tabular mt-1 font-mono text-sm text-paper">
            {address
              ? `${formatAmount(userBalance, decimals, 2)} ${symbol}`
              : "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={addToken}
          disabled={!address || !IS_CONFIGURED || addedToken}
          className="inline-flex items-center gap-1.5 rounded-full border border-paper/10 px-3 py-2 text-[10px] font-semibold text-paper-dim transition hover:border-brand/40 hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-3" />
          {addedToken ? "Added" : "Add token"}
        </button>
      </div>
    </div>
  );
}
