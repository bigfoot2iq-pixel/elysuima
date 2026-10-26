"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { LINKS } from "@/lib/config";
import {
  MINT_MAINNET_CHAINS_LABEL,
  type MintMainnetCheck,
} from "@/lib/launchpad/balance";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Keeps dust balances from rounding down to a misleading "0". */
function nativeAmount(value: bigint | undefined, decimals = 18) {
  if (value === undefined) return "—";
  const formatted = formatAmount(value, decimals, 4);
  return formatted === "0" && value > 0n ? "<0.0001" : formatted;
}

/**
 * Shows the mainnet ETH/HYPE balance that qualifies the wallet for a mint.
 *
 * The launchpad can run on Elysium testnet, where balances are free and cannot
 * prove anything about a wallet. This panel therefore reads the five mainnet
 * chains used by the claim flow instead of the mint chain.
 */
export function MintBalanceCheck({
  address,
  check,
  checking,
  unavailable,
  onRetry,
  isTestnet,
}: {
  address?: string;
  check: MintMainnetCheck;
  checking: boolean;
  unavailable: boolean;
  onRetry: () => void;
  isTestnet: boolean;
}) {
  if (!address) {
    return (
      <div className="mt-2.5 rounded-xl border border-paper/[0.08] bg-paper/[0.02] px-3.5 py-2.5">
        <p className="text-[10px] leading-5 text-paper-mute">
          Mint requires at least{" "}
          <span className="font-mono text-paper-dim">
            {check.requirementLabel}
          </span>{" "}
          on {MINT_MAINNET_CHAINS_LABEL}. Testnet balances do not count.
        </p>
        <GasNote isTestnet={isTestnet} />
      </div>
    );
  }

  const bestChain = check.bestChain;
  const eligible = check.eligible && bestChain !== null;
  const warn = unavailable || (!checking && !eligible);

  return (
    <div
      id="mint-mainnet-check"
      aria-live="polite"
      className={cn(
        "mt-2.5 rounded-xl border px-3.5 py-2.5",
        warn
          ? "border-warn/25 bg-warn/[0.06]"
          : "border-paper/[0.08] bg-paper/[0.02]",
      )}
    >
      <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-paper-mute">
          {checking ? (
            <Loader2 className="size-3 animate-spin" />
          ) : warn ? (
            <AlertTriangle className="size-3 text-warn" />
          ) : (
            <Check className="size-3 text-mint" />
          )}
          Mainnet balance
        </span>
        <span
          className={cn(
            "tabular min-w-0 text-right",
            warn ? "text-warn" : "text-paper",
          )}
        >
          {checking
            ? "Checking…"
            : unavailable
              ? "Unavailable"
              : eligible
                ? `Eligible via ${bestChain.name}`
                : "Not eligible"}
        </span>
      </div>

      {checking ? (
        <p className="mt-1.5 border-t border-paper/[0.07] pt-1.5 text-[10px] leading-4 text-paper-dim">
          Reading Hyperliquid, HyperEVM, Ethereum, Base, and Ink.
        </p>
      ) : unavailable ? (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-warn/15 pt-1.5">
          <p className="text-[10px] leading-4 text-paper-dim">
            The mainnet balance check could not be reached. Retry before
            minting.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 font-semibold text-warn transition hover:text-paper"
          >
            <RefreshCw className="size-3" />
            Retry
          </button>
        </div>
      ) : eligible && bestChain ? (
        <p className="mt-1.5 border-t border-paper/[0.07] pt-1.5 text-[10px] leading-4 text-paper-dim">
          Holds{" "}
          <span className="font-mono text-mint">
            {nativeAmount(BigInt(bestChain.balance))} {bestChain.nativeSymbol}
          </span>{" "}
          on {bestChain.name}. Minimum{" "}
          <span className="font-mono text-paper-dim">
            {nativeAmount(check.required ?? undefined)}{" "}
            {bestChain.nativeSymbol}
          </span>
          .
        </p>
      ) : (
        <p className="mt-1.5 border-t border-warn/15 pt-1.5 text-[10px] leading-4 text-paper-dim">
          Hold at least{" "}
          <span className="font-mono text-warn">{check.requirementLabel}</span>{" "}
          on {MINT_MAINNET_CHAINS_LABEL}. Testnet balances do not count.
        </p>
      )}

      <GasNote isTestnet={isTestnet} />
    </div>
  );
}

function GasNote({ isTestnet }: { isTestnet: boolean }) {
  return (
    <p className="mt-1.5 text-[10px] leading-4 text-paper-mute">
      Mint gas is paid in {isTestnet ? "testnet " : ""}HYPE.{" "}
      {isTestnet ? (
        <Link
          href="/faucet"
          className="inline-flex items-center gap-1 font-semibold text-paper-dim transition hover:text-brand"
        >
          Get testnet HYPE
          <ArrowUpRight className="size-3" />
        </Link>
      ) : (
        <a
          href={LINKS.bridge}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-paper-dim transition hover:text-brand"
        >
          Bridge HYPE
          <ArrowUpRight className="size-3" />
        </a>
      )}
    </p>
  );
}
