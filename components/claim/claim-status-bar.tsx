"use client";

import { Plus, ShieldCheck } from "lucide-react";
import { ChainIcon } from "@/components/chain-icon";
import { ELIGIBILITY_CHAINS } from "@/lib/chains";
import { IS_CONFIGURED } from "@/lib/config";
import { formatAmount, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClaimData } from "./claim-data";

export function ClaimStatusBar() {
  const {
    address,
    eligibility,
    thresholdEligible,
    checking,
    userBalance,
    claimBalance,
    symbol,
    decimals,
    addedToken,
    addToken,
  } = useClaimData();

  const summary = (() => {
    if (!address) return "Connect a wallet to check all five chains.";
    if (checking)
      return "Checking Hyperliquid, HyperEVM, Ethereum, Base, and Ink…";
    if (eligibility.isError) return "Balance check unavailable. Retry in a moment.";
    if (eligibility.data?.eligible)
      return `Eligible via ${eligibility.data.bestChain}.`;
    if (eligibility.data?.allUnavailable)
      return "Balance networks are unreachable right now.";
    if (eligibility.data) return "No qualifying balance found yet.";
    return "Waiting for a balance check…";
  })();

  const hasError = eligibility.isError || eligibility.data?.allUnavailable;

  return (
    <div className="glass mt-4 rounded-[24px] px-4 py-3.5 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-brand/20 bg-brand/[0.07] text-brand">
            <ShieldCheck className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[9px] uppercase tracking-[0.2em] text-paper-mute">
                Threshold check
              </p>
              <div className="flex items-center gap-1">
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
                        "inline-flex rounded-md border p-0.5 transition",
                        result?.ok
                          ? "border-mint/30 bg-mint/[0.06]"
                          : result?.error
                            ? "border-warn/25 bg-warn/[0.05]"
                            : "border-paper/[0.07] bg-paper/[0.02] opacity-60",
                      )}
                    >
                      <ChainIcon chainKey={chain.key} size={15} />
                    </span>
                  );
                })}
              </div>
            </div>
            <p
              className={cn(
                "mt-1 text-[11px] leading-5",
                thresholdEligible
                  ? "text-mint"
                  : hasError
                    ? "text-warn"
                    : "text-paper-dim",
              )}
            >
              {summary}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-paper/[0.07] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
              Your balance
            </p>
            <p className="tabular mt-0.5 font-mono text-sm text-paper">
              {address
                ? `${formatAmount(userBalance, decimals, 2)} ${symbol}`
                : "—"}
            </p>
            <p className="mt-0.5 text-[9px] text-paper-mute">
              {claimBalance === undefined
                ? "Claim pool unavailable"
                : `${formatCompact(claimBalance, decimals)} ${symbol} left to claim`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void addToken()}
            disabled={!address || !IS_CONFIGURED || addedToken}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-paper/10 px-3 py-2 text-[10px] font-semibold text-paper-dim transition hover:border-brand/40 hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-3" />
            {addedToken ? "Added" : "Add token"}
          </button>
        </div>
      </div>
    </div>
  );
}
