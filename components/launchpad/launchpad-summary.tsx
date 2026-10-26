import { ArrowUpRight, Share2 } from "lucide-react";
import { getDropStatus, getSupplyState } from "@/lib/launchpad/status";
import { getUnitPrice, getPerWalletLimit } from "@/lib/launchpad/drop";
import type {
  ContractInspection,
  PublicLaunchpadConfig,
} from "@/lib/launchpad/types";
import { explorerAddressFor } from "@/lib/chains";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HERO_MASCOT_ID, getMascot, MASCOT_ACCENTS } from "@/lib/mascots";
import { TokenMark } from "../token-mark";

const TONE_STYLES = {
  mint: "border-mint/30 bg-mint/10 text-mint",
  brand: "border-brand/30 bg-brand/10 text-brand",
  warn: "border-warn/30 bg-warn/10 text-warn",
  danger: "border-danger/30 bg-danger/10 text-danger",
  muted: "border-paper/10 bg-paper/[0.04] text-paper-dim",
} as const;

function priceLabel(
  config: PublicLaunchpadConfig,
  inspection: ContractInspection | undefined,
) {
  const wei = getUnitPrice(config, inspection);
  if (wei === undefined) return "—";
  if (wei === 0n) return "Free";
  try {
    const { decimals, symbol } = config.chain.nativeCurrency;
    return `${formatAmount(wei, decimals, 4)} ${symbol}`;
  } catch {
    return "—";
  }
}

export function LaunchpadSummary({
  config,
  inspection,
  now,
}: {
  config: PublicLaunchpadConfig;
  inspection?: ContractInspection;
  now: number;
}) {
  const status = getDropStatus(config, inspection, now);
  const { totalSupply, maxSupply, remaining } = getSupplyState(
    config,
    inspection,
  );
  const mascot = getMascot(HERO_MASCOT_ID);

  const perWallet = getPerWalletLimit(config, inspection);

  const mintedCount = totalSupply !== undefined ? Number(totalSupply) : 0;
  const cap = maxSupply ? Number(maxSupply) : 0;
  const supplyProgress =
    cap > 0 ? Math.min(100, (mintedCount / cap) * 100) : null;
  const stats = [
    {
      label: "Supply",
      value: maxSupply ? formatAmount(maxSupply, 0, 0) : "Open",
    },
    {
      label: "Minted",
      value: totalSupply !== undefined ? formatAmount(totalSupply, 0, 0) : "0",
    },
    { label: "Price", value: priceLabel(config, inspection) },
    { label: "Max / wallet", value: String(perWallet) },
  ];

  return (
    <section className="section-shell pt-10 sm:pt-14">
      <div className="glass rounded-[28px] p-4 sm:p-5">
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border",
                MASCOT_ACCENTS[mascot.accent],
              )}
            >
              <TokenMark size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-lg font-semibold tracking-[-0.03em] text-paper">
                  {inspection?.name || config.title}
                </h1>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em]",
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
              <p className="mt-0.5 max-w-md truncate text-xs text-paper-mute">
                {config.tagline}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {config.twitterUrl ? (
              <a
                href={config.twitterUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Elyziuma on X"
                className="btn-ghost size-9 p-0"
              >
                <Share2 className="size-3.5" />
              </a>
            ) : null}
            {config.discordUrl ? (
              <a
                href={config.discordUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Elyziuma community"
                className="btn-ghost h-9 gap-1.5 px-3 text-[13px]"
              >
                Community
                <ArrowUpRight className="size-3.5" />
              </a>
            ) : null}
            {config.collectionAddress ? (
              <a
                href={explorerAddressFor(config.chainId, config.collectionAddress)}
                target="_blank"
                rel="noreferrer"
                aria-label="Open the collection on ElysScan"
                className="btn-ghost size-9 p-0"
              >
                <ArrowUpRight className="size-3.5" />
              </a>
            ) : null}
          </div>
        </div>

        <dl className="mt-3.5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-paper/[0.08] bg-paper/[0.06] sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-ink/70 px-3.5 py-2.5">
              <dd className="tabular font-mono text-sm font-semibold text-paper">
                {stat.value}
              </dd>
              <dt className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-paper-mute">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>

        {supplyProgress !== null ? (
          <div className="mt-3 flex items-center gap-2.5">
            <div
              role="progressbar"
              aria-label="Collection mint progress"
              aria-valuemin={0}
              aria-valuemax={cap}
              aria-valuenow={mintedCount}
              className="h-1 flex-1 overflow-hidden rounded-full bg-paper/[0.06]"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-mint transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(supplyProgress, 1.5)}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-paper-mute">
              {remaining !== undefined
                ? `${Number(remaining).toLocaleString("en-US")} left`
                : ""}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}