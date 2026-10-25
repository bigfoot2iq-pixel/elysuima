"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Check, Loader2 } from "lucide-react";
import { LINKS } from "@/lib/config";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Keeps dust balances from rounding down to a misleading "0". */
function nativeAmount(value: bigint | undefined, decimals: number) {
  if (value === undefined) return "—";
  const formatted = formatAmount(value, decimals, 4);
  return formatted === "0" && value > 0n ? "<0.0001" : formatted;
}

/**
 * Shows the native balance the wallet holds on the mint chain and whether it
 * meets the minimum needed for the mint plus gas. The check is informational
 * before a wallet is connected, then becomes the visible reason the mint button
 * is blocked until the requirement is met.
 */
export function MintBalanceCheck({
  address,
  balance,
  required,
  symbol,
  decimals,
  checking,
  unavailable,
  isTestnet,
}: {
  address?: string;
  balance?: bigint;
  required: bigint;
  symbol: string;
  decimals: number;
  checking: boolean;
  unavailable: boolean;
  isTestnet: boolean;
}) {
  if (!address) {
    return (
      <p className="mt-2.5 text-center text-[10px] leading-5 text-paper-mute">
        Your wallet needs at least{" "}
        <span className="font-mono text-paper-dim">
          {nativeAmount(required, decimals)} {symbol}
        </span>{" "}
        to cover the mint and gas.
      </p>
    );
  }

  const shortfall =
    balance !== undefined && balance < required ? required - balance : 0n;
  const insufficient = shortfall > 0n;

  return (
    <div
      aria-live="polite"
      className={cn(
        "mt-2.5 rounded-xl border px-3.5 py-2.5",
        insufficient || unavailable
          ? "border-warn/25 bg-warn/[0.06]"
          : "border-paper/[0.08] bg-paper/[0.02]",
      )}
    >
      <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-paper-mute">
          {checking ? (
            <Loader2 className="size-3 animate-spin" />
          ) : insufficient || unavailable ? (
            <AlertTriangle className="size-3 text-warn" />
          ) : (
            <Check className="size-3 text-mint" />
          )}
          Wallet balance
        </span>
        <span
          className={cn(
            "tabular min-w-0 text-right",
            insufficient || unavailable ? "text-warn" : "text-paper",
          )}
        >
          {checking
            ? "Checking…"
            : unavailable
              ? "Unavailable"
              : `${nativeAmount(balance, decimals)} ${symbol}`}
          {!checking && !unavailable ? (
            <span className="text-paper-mute">
              {" "}
              · min {nativeAmount(required, decimals)}
            </span>
          ) : null}
        </span>
      </div>

      {insufficient ? (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-warn/15 pt-1.5">
          <p className="text-[10px] leading-4 text-paper-dim">
            Add{" "}
            <span className="font-mono text-warn">
              {nativeAmount(shortfall, decimals)} {symbol}
            </span>{" "}
            to reach the minimum for the mint and gas.
          </p>
          {isTestnet ? (
            <Link
              href="/faucet"
              className="inline-flex items-center gap-1 font-semibold text-warn transition hover:text-paper"
            >
              Get testnet {symbol}
              <ArrowUpRight className="size-3" />
            </Link>
          ) : (
            <a
              href={LINKS.bridge}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-warn transition hover:text-paper"
            >
              Bridge {symbol}
              <ArrowUpRight className="size-3" />
            </a>
          )}
        </div>
      ) : unavailable ? (
        <p className="mt-1.5 border-t border-warn/15 pt-1.5 text-[10px] leading-4 text-paper-dim">
          The wallet balance could not be read. Try the check again before
          minting.
        </p>
      ) : null}
    </div>
  );
}
