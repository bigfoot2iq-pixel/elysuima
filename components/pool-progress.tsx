import { formatAmount, formatCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Presentational progress bar for a claim pool. Shared by the public claim page
 * and the owner console so both views describe pool progress the same way.
 */
export function PoolProgress({
  label,
  claimed,
  total,
  remaining,
  symbol,
  decimals,
  tone,
  claimedLabel = "claimed",
  totalText,
}: {
  label: string;
  claimed?: bigint;
  total?: bigint;
  remaining?: bigint;
  symbol: string;
  decimals: number;
  tone: "brand" | "mint";
  /** Wording for the filled portion, e.g. "claimed" or "active". */
  claimedLabel?: string;
  /** Optional exact total, used when compact notation would hide detail. */
  totalText?: string;
}) {
  const poolTotal = total !== undefined && total > 0n ? total : undefined;
  const percent =
    poolTotal !== undefined && claimed !== undefined
      ? Math.min(100, Number((claimed * 10_000n) / poolTotal) / 100)
      : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
          {label}
        </span>
        <span className="tabular font-mono text-[10px] text-paper-dim">
          {poolTotal !== undefined && claimed !== undefined
            ? `${formatPercent(percent / 100, 2)} ${claimedLabel}`
            : "Syncing…"}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={
          poolTotal !== undefined && claimed !== undefined
            ? `${formatPercent(percent / 100, 2)} ${claimedLabel}`
            : "Pool data is loading"
        }
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper/[0.08]"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            tone === "mint"
              ? "bg-gradient-to-r from-mint/60 to-mint"
              : "bg-gradient-to-r from-brand-deep via-brand to-brand-soft",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 font-mono text-[9px] text-paper-mute">
        <span>
          {claimed !== undefined
            ? `${formatAmount(claimed, decimals, 0)} ${symbol} ${claimedLabel}`
            : "—"}
        </span>
        <span>
          {remaining !== undefined
            ? `${formatCompact(remaining, decimals)} left${
                poolTotal !== undefined
                  ? ` of ${
                      totalText ?? formatCompact(poolTotal, decimals)
                    }`
                  : ""
              }`
            : "—"}
        </span>
      </div>
    </div>
  );
}
