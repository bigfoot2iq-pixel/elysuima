"use client";

import {
  AlertTriangle,
  Check,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAccount } from "wagmi";
import { ELIGIBILITY_CHAINS } from "@/lib/chains";
import type { EligibilityChain } from "@/lib/eligibility-types";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useEligibility } from "@/hooks/use-eligibility";
import { useNow } from "@/hooks/use-now";
import { ChainIcon } from "./chain-icon";

function ChainRow({
  chain,
  result,
  address,
  thresholdWei,
}: {
  chain: (typeof ELIGIBILITY_CHAINS)[number];
  result?: EligibilityChain;
  address?: string;
  thresholdWei: string;
}) {
  const progress =
    result && !result.error && BigInt(thresholdWei) > 0n
      ? Math.min(
          100,
          Number((BigInt(result.balance) * 10_000n) / BigInt(thresholdWei)) / 100,
        )
      : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5 transition",
        result?.ok
          ? "border-mint/20 bg-mint/[0.045]"
          : result?.error
            ? "border-warn/20 bg-warn/[0.03]"
            : "border-paper/[0.06] bg-paper/[0.02]",
      )}
    >
      <div className="flex items-center gap-3">
        <ChainIcon chainKey={chain.key} size={34} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium text-paper">
                {chain.name}
              </span>
              <span className="hidden rounded-full border border-paper/[0.08] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-paper-mute sm:inline">
                {chain.nativeSymbol}
              </span>
              {address ? (
                <a
                  href={`${chain.explorer}/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View wallet on ${chain.name}`}
                  className="text-paper-mute transition hover:text-brand"
                >
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
            <span className="tabular shrink-0 font-mono text-xs text-paper">
              {result ? result.balanceFormatted : "—"}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-paper/[0.06]">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700",
                  result?.ok
                    ? "bg-mint"
                    : result?.error
                      ? "bg-warn/60"
                      : "bg-brand/50",
                )}
                style={{ width: `${result?.error ? 100 : progress}%` }}
              />
            </div>
            <span
              className={cn(
                "shrink-0 font-mono text-[8px] uppercase tracking-[0.1em]",
                result?.ok
                  ? "text-mint"
                  : result?.error
                    ? "text-warn"
                    : "text-paper-mute",
              )}
            >
              {result?.ok
                ? "Qualified"
                : result?.error
                  ? "Unavailable"
                  : "Min 0.001"}
            </span>
          </div>
        </div>

        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border",
            result?.ok
              ? "border-mint/30 bg-mint/10 text-mint"
              : result?.error
                ? "border-warn/30 bg-warn/10 text-warn"
                : "border-paper/[0.08] text-paper-mute",
          )}
        >
          {result?.ok ? (
            <Check className="size-3" />
          ) : result?.error ? (
            <AlertTriangle className="size-3" />
          ) : (
            <X className="size-3" />
          )}
        </span>
      </div>
    </div>
  );
}

export function EligibilityPanel() {
  const { address } = useAccount();
  const eligibility = useEligibility(address);
  const now = useNow(5_000);

  const data = eligibility.data;
  const thresholdWei = data?.thresholdWei ?? "1000000000000000";
  const checkedAgo =
    data && now
      ? formatRelative(Math.floor(data.checkedAt / 1_000), now)
      : "not checked yet";

  const status = (() => {
    if (!address) {
      return {
        tone: "muted" as const,
        title: "Connect to check",
        body: "We'll look up your native balance on all five chains.",
      };
    }
    if (eligibility.isLoading && !data) {
      return {
        tone: "brand" as const,
        title: "Checking your wallet",
        body: "Reading balances from Hyperliquid, HyperEVM, Ethereum, Base, and Ink.",
      };
    }
    if (eligibility.isError) {
      return {
        tone: "warn" as const,
        title: "Balance check unavailable",
        body: "One or more RPCs did not respond. Retry the check.",
      };
    }
    if (data?.allUnavailable) {
      return {
        tone: "warn" as const,
        title: "Networks unreachable",
        body: "None of the balance RPCs responded. Retry in a moment.",
      };
    }
    if (data?.eligible) {
      return {
        tone: "mint" as const,
        title: `Eligible via ${data.bestChain}`,
        body: "Your wallet holds at least 0.001 ETH or HYPE on a supported chain.",
      };
    }
    return {
      tone: "muted" as const,
      title: "Not eligible yet",
      body: "Hold at least 0.001 ETH or HYPE on any one of these five chains.",
    };
  })();

  const statusStyles = {
    mint: "border-mint/20 bg-mint/[0.06] text-mint",
    warn: "border-warn/20 bg-warn/[0.06] text-warn",
    muted: "border-paper/[0.08] bg-paper/[0.025] text-paper-dim",
    brand: "border-brand/20 bg-brand/[0.06] text-brand",
  };

  return (
    <div
      id="eligibility"
      className="glass rounded-[28px] p-5 sm:p-6"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand" />
            <p className="text-[9px] uppercase tracking-[0.22em] text-paper-dim">
              Eligibility
            </p>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-paper">
            Your wallet, across five chains.
          </h2>
          <p className="mt-1.5 text-xs leading-5 text-paper-mute">
            Hold 0.001 ETH or HYPE on any one chain to unlock the daily claim.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void eligibility.refetch()}
          disabled={eligibility.isFetching || !address}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-paper/10 bg-paper/[0.03] text-paper-dim transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Recheck eligibility"
          title="Recheck eligibility"
        >
          <RefreshCw
            className={cn("size-3.5", eligibility.isFetching && "animate-spin")}
          />
        </button>
      </div>

      <div className="mt-5 space-y-2">
        {ELIGIBILITY_CHAINS.map((chain) => (
          <ChainRow
            key={chain.key}
            chain={chain}
            result={data?.chains.find((item) => item.key === chain.key)}
            address={address}
            thresholdWei={thresholdWei}
          />
        ))}
      </div>

      <div
        className={cn(
          "mt-4 rounded-2xl border p-3.5",
          statusStyles[status.tone],
        )}
      >
        <p className="text-xs font-semibold">{status.title}</p>
        <p className="mt-1 text-[11px] leading-5 opacity-80">{status.body}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
          Checked {checkedAgo}
        </p>
        <a
          href="#faq"
          className="text-[10px] font-medium text-paper-mute underline decoration-paper/20 underline-offset-4 transition hover:text-brand"
        >
          Why a balance check?
        </a>
      </div>

      <p className="mt-3 text-[10px] leading-5 text-paper-mute/80">
        Balances are checked off-chain. The claim itself is authorized with a
        short-lived EIP-712 signature bound to your wallet.
      </p>
    </div>
  );
}
