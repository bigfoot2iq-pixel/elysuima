"use client";

import { AlertTriangle, Check, RefreshCw, ShieldCheck, X } from "lucide-react";
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
}: {
  chain: (typeof ELIGIBILITY_CHAINS)[number];
  result?: EligibilityChain;
}) {
  const statusLabel = result?.ok
    ? "Qualified"
    : result?.error
      ? "Unavailable"
      : "Not checked";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition",
        result?.ok
          ? "border-mint/20 bg-mint/[0.045]"
          : result?.error
            ? "border-warn/20 bg-warn/[0.03]"
            : "border-paper/[0.06] bg-paper/[0.02]",
      )}
    >
      <ChainIcon chainKey={chain.key} size={28} />

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-[13px] font-medium text-paper">
          {chain.name}
        </span>
        <span className="hidden rounded-full border border-paper/[0.08] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-paper-mute sm:inline">
          {chain.nativeSymbol}
        </span>
      </div>

      <span className="tabular shrink-0 font-mono text-xs text-paper">
        {result ? result.balanceFormatted : "—"}
      </span>

      <span
        title={statusLabel}
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
        <span className="sr-only">{statusLabel}</span>
      </span>
    </div>
  );
}

export function EligibilityPanel() {
  const { address } = useAccount();
  const eligibility = useEligibility(address);
  const now = useNow(5_000);

  const data = eligibility.data;
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
      className="glass rounded-[28px] p-4 sm:p-5"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand" />
          <p className="text-[9px] uppercase tracking-[0.22em] text-paper-dim">
            Eligibility
          </p>
        </div>
        <button
          type="button"
          onClick={() => void eligibility.refetch()}
          disabled={eligibility.isFetching || !address}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-paper/10 bg-paper/[0.03] text-paper-dim transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Recheck eligibility"
          title="Recheck eligibility"
        >
          <RefreshCw
            className={cn("size-3.5", eligibility.isFetching && "animate-spin")}
          />
        </button>
      </div>

      <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-paper sm:text-xl">
        One threshold, five chains.
      </h2>

      <div className="mt-4 space-y-1.5">
        {ELIGIBILITY_CHAINS.map((chain) => (
          <ChainRow
            key={chain.key}
            chain={chain}
            result={data?.chains.find((item) => item.key === chain.key)}
          />
        ))}
      </div>

      <div
        className={cn(
          "mt-3 rounded-xl border px-3.5 py-3",
          statusStyles[status.tone],
        )}
      >
        <p className="text-xs font-semibold">{status.title}</p>
        <p className="mt-0.5 text-[11px] leading-5 opacity-80">{status.body}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
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
    </div>
  );
}
