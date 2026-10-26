"use client";

import type { ReactNode } from "react";
import {
  Check,
  ExternalLink,
  Fuel,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { explorerTx } from "@/lib/config";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClaimData } from "./claim-data";

export type ClaimTone = "mint" | "warn" | "danger" | "muted" | "brand";

const TONE_STYLES: Record<ClaimTone, string> = {
  mint: "border-mint/30 bg-mint/10 text-mint",
  warn: "border-warn/30 bg-warn/10 text-warn",
  danger: "border-danger/30 bg-danger/10 text-danger",
  muted: "border-paper/10 bg-paper/[0.04] text-paper-dim",
  brand: "border-brand/30 bg-brand/10 text-brand",
};

export function ClaimStatusBadge({
  tone,
  children,
}: {
  tone: ClaimTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em]",
        TONE_STYLES[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function ClaimStat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col-reverse gap-0.5 bg-ink/70 px-3 py-2.5">
      <dt className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
        {label}
      </dt>
      <dd className="tabular truncate font-mono text-sm font-semibold text-paper">
        {value}
      </dd>
    </div>
  );
}

export function ClaimCardFooter({ fee }: { fee?: bigint }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-paper/[0.07] pt-3.5 text-[10px] text-paper-mute">
      <span className="font-mono">
        {fee === undefined
          ? "Claim fee —"
          : fee === 0n
            ? "No claim fee"
            : `${formatAmount(fee, 18, 6)} HYPE fee`}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Fuel className="size-3.5" />
        Gas in HYPE
      </span>
    </div>
  );
}

export function ClaimSuccessPanel({ hash }: { hash: string }) {
  const { addToken, addedToken } = useClaimData();

  return (
    <div className="mt-4 rounded-2xl border border-mint/25 bg-mint/[0.07] p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint/15 text-mint">
          <Check className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-mint">Claim confirmed</p>
          <p className="mt-1 text-[11px] leading-5 text-paper-dim">
            Your ELYZ was sent to your wallet.
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
              onClick={() => void addToken()}
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
  );
}

export function ClaimError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-danger"
    >
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}
