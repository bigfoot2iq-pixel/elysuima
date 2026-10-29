"use client";

import {
  AlertTriangle,
  Check,
  Loader2,
  Minus,
  RefreshCw,
  X,
} from "lucide-react";
import type { Address } from "viem";
import { ChainIcon } from "@/components/chain-icon";
import { CLAIM_ELIGIBILITY_CHAINS } from "@/lib/chains";
import type { EligibilityResponse } from "@/lib/eligibility-types";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

type CheckTone = "mint" | "warn" | "brand" | "muted";

const TONE_STYLES: Record<CheckTone, string> = {
  mint: "border-mint/25 bg-mint/[0.06] text-mint",
  warn: "border-warn/25 bg-warn/[0.05] text-warn",
  brand: "border-brand/25 bg-brand/[0.05] text-brand",
  muted: "border-paper/[0.08] bg-paper/[0.025] text-paper-dim",
};

const ROW_STYLES = {
  met: "border-mint/20 bg-mint/[0.045]",
  error: "border-warn/20 bg-warn/[0.03]",
  default: "border-paper/[0.06] bg-paper/[0.02]",
} as const;

/**
 * The community claim's first step: show every accepted mainnet requirement
 * with the balance this wallet actually holds, so a failed claim explains
 * itself instead of relying on a paragraph of small print.
 */
export function CommunityEligibilityCheck({
  address,
  data,
  isPending,
  isError,
  isFetching,
  onRetry,
}: {
  address?: Address;
  data?: EligibilityResponse;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
}) {
  const rows = CLAIM_ELIGIBILITY_CHAINS.map((chain) => ({
    chain,
    result: data?.chains.find((item) => item.key === chain.key),
  }));
  const best = rows.find((row) => row.result?.ok) ?? null;
  const checking = Boolean(address) && isPending && !data;
  const allUnavailable =
    rows.length > 0 && rows.every((row) => Boolean(row.result?.error));

  const summary = (() => {
    if (!address) {
      return {
        tone: "muted" as const,
        icon: null,
        title: "Connect to check",
        body: "Connect the wallet you want to claim with, then we'll read its mainnet balances.",
      };
    }
    if (checking) {
      return {
        tone: "brand" as const,
        icon: <Loader2 className="size-3.5 animate-spin" />,
        title: "Checking your balances",
        body: "Reading Ethereum, Hyperliquid, and HyperEVM mainnet balances.",
      };
    }
    if (isError) {
      return {
        tone: "warn" as const,
        icon: <AlertTriangle className="size-3.5" />,
        title: "Balance check unavailable",
        body: "The eligibility service did not respond. Retry to try again.",
      };
    }
    if (allUnavailable) {
      return {
        tone: "warn" as const,
        icon: <AlertTriangle className="size-3.5" />,
        title: "Networks unreachable",
        body: "None of the three RPCs responded. Retry in a moment.",
      };
    }
    if (best) {
      return {
        tone: "mint" as const,
        icon: <Check className="size-3.5" />,
        title: `Eligible via ${best.chain.name}`,
        body: "One requirement is met, so the community claim is unlocked.",
      };
    }
    return {
      tone: "muted" as const,
      icon: <X className="size-3.5" />,
      title: "No requirement met yet",
      body: "Fund any one of these mainnet balances, then recheck. Balances can take about 30 seconds to refresh.",
    };
  })();

  return (
    <section
      aria-labelledby="community-eligibility-heading"
      className="mt-5 rounded-2xl border border-paper/[0.08] bg-ink/35 p-3.5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 font-mono text-[9px] font-semibold text-brand">
            1
          </span>
          <h3
            id="community-eligibility-heading"
            className="text-[9px] uppercase tracking-[0.18em] text-paper-dim"
          >
            Eligibility check
          </h3>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={!address || isFetching}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-paper/10 bg-paper/[0.03] px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-paper-mute transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Recheck eligibility"
          title="Recheck eligibility"
        >
          <RefreshCw className={cn("size-3", isFetching && "animate-spin")} />
          Recheck
        </button>
      </div>

      <p className="mt-1.5 text-[10px] leading-4 text-paper-mute">
        Hold at least one of these mainnet balances. The check only reads your
        wallet — nothing is signed.
      </p>

      <ul className="mt-3 space-y-1.5">
        {rows.map(({ chain, result }) => {
          const met = result?.ok === true;
          const failed = Boolean(result && !result.ok && !result.error);
          const unavailable = Boolean(result?.error);
          const statusLabel = met
            ? "Qualified"
            : unavailable
              ? "Balance check unavailable"
              : failed
                ? `Needs ${chain.minBalance} ${chain.nativeSymbol}`
                : checking
                  ? "Checking balance"
                  : "Not checked";

          return (
            <li
              key={chain.key}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition",
                met
                  ? ROW_STYLES.met
                  : unavailable
                    ? ROW_STYLES.error
                    : ROW_STYLES.default,
              )}
            >
              <ChainIcon chainKey={chain.key} size={24} />

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[11px] font-medium text-paper">
                    {chain.name}
                  </span>
                  <span className="hidden rounded-full border border-paper/[0.08] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-paper-mute sm:inline">
                    {chain.nativeSymbol}
                  </span>
                </div>
                <span className="mt-0.5 block font-mono text-[9px] text-paper-mute">
                  {chain.minBalance} {chain.nativeSymbol} required
                </span>
              </div>

              <span
                className={cn(
                  "tabular shrink-0 font-mono text-[10px]",
                  met ? "text-mint" : "text-paper",
                )}
              >
                {result && !result.error
                  ? formatAmount(BigInt(result.balance), 18, 6)
                  : checking
                    ? "…"
                    : "—"}
              </span>

              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  met
                    ? "border-mint/30 bg-mint/10 text-mint"
                    : unavailable
                      ? "border-warn/30 bg-warn/10 text-warn"
                      : "border-paper/[0.08] text-paper-mute",
                )}
              >
                {met ? (
                  <Check className="size-2.5" />
                ) : unavailable ? (
                  <AlertTriangle className="size-2.5" />
                ) : checking ? (
                  <Loader2 className="size-2.5 animate-spin" />
                ) : failed ? (
                  <X className="size-2.5" />
                ) : (
                  <Minus className="size-2.5" />
                )}
                <span className="sr-only">{statusLabel}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div
        aria-live="polite"
        className={cn(
          "mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5",
          TONE_STYLES[summary.tone],
        )}
      >
        {summary.icon ? (
          <span className="mt-0.5 shrink-0">{summary.icon}</span>
        ) : (
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-current" />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold">{summary.title}</p>
          <p className="mt-0.5 text-[10px] leading-4 opacity-80">
            {summary.body}
          </p>
        </div>
      </div>
    </section>
  );
}
