"use client";

import type { ComponentType, ReactNode } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Copy,
  Info,
  Loader2,
  Wallet,
} from "lucide-react";
import type { Hash } from "viem";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/format";

type Icon = ComponentType<{ className?: string }>;

export type Tone = "mint" | "brand" | "warn" | "danger" | "muted";

const toneStyles: Record<Tone, string> = {
  mint: "border-mint/25 bg-mint/[0.06] text-mint",
  brand: "border-brand/25 bg-brand/[0.06] text-brand",
  warn: "border-warn/25 bg-warn/[0.06] text-warn",
  danger: "border-danger/25 bg-danger/[0.06] text-danger",
  muted: "border-paper/10 bg-paper/[0.03] text-paper-dim",
};

const dotStyles: Record<Tone, string> = {
  mint: "bg-mint shadow-[0_0_8px_rgba(125,240,196,0.7)]",
  brand: "bg-brand shadow-[0_0_8px_rgba(52,183,221,0.7)]",
  warn: "bg-warn shadow-[0_0_8px_rgba(245,180,91,0.7)]",
  danger: "bg-danger shadow-[0_0_8px_rgba(255,122,122,0.7)]",
  muted: "bg-paper/30",
};

export function StatusPill({
  tone = "muted",
  pulse = false,
  children,
  className,
}: {
  tone?: Tone;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em]",
        toneStyles[tone],
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", dotStyles[tone], pulse && "live-dot")}
      />
      {children}
    </span>
  );
}

export function SectionHeader({
  index,
  title,
  description,
  status,
}: {
  index: string;
  title: string;
  description: string;
  status?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-paper/[0.08] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="font-display text-[42px] leading-[0.8] tracking-[-0.06em] text-paper/[0.13] sm:text-[52px]"
        >
          {index}
        </span>
        <div className="pt-0.5">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.035em] text-paper sm:text-[28px]">
            {title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-[11px] leading-6 text-paper-mute">
            {description}
          </p>
        </div>
      </div>
      {status ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {status}
        </div>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  sheen = false,
}: {
  children: ReactNode;
  className?: string;
  sheen?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass rounded-3xl p-5 sm:p-6",
        sheen && "card-sheen",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeading({
  icon: Icon,
  title,
  description,
  aside,
}: {
  icon: Icon;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-paper/[0.08] bg-paper/[0.03] text-brand">
          <Icon className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-paper">{title}</h3>
          <p className="mt-1 max-w-lg text-[11px] leading-5 text-paper-mute">
            {description}
          </p>
        </div>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[9px] uppercase tracking-[0.14em] text-paper-mute">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-[9px] leading-5 text-paper-mute/80">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Accessible name for the switch. */
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-mint/40 bg-mint/20"
          : "border-paper/15 bg-paper/[0.04]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none block size-4 rounded-full transition-transform duration-200",
          checked
            ? "translate-x-[22px] bg-mint shadow-[0_0_10px_rgba(125,240,196,0.45)]"
            : "translate-x-1 bg-paper-mute",
        )}
      />
    </button>
  );
}

export function AddressRow({
  label,
  value,
  href,
  onCopy,
}: {
  label: string;
  value: string;
  href?: string;
  onCopy?: () => void;
}) {
  const isAddressLike = value.startsWith("0x");

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
          {label}
        </p>
        <p className="mt-1 truncate font-mono text-[11px] text-paper">
          {value === "—" ? value : isAddressLike ? shortAddress(value, 6) : value}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="flex size-7 items-center justify-center rounded-full text-paper-mute transition hover:bg-paper/[0.05] hover:text-paper"
            aria-label={`Copy ${label}`}
          >
            <Copy className="size-3" />
          </button>
        ) : null}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex size-7 items-center justify-center rounded-full text-paper-mute transition hover:bg-paper/[0.05] hover:text-brand"
            aria-label={`Open ${label} in explorer`}
          >
            <ArrowUpRight className="size-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function Notice({
  tone,
  title,
  body,
  action,
}: {
  tone: "warn" | "danger" | "info" | "success";
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  const styles = {
    warn: "border-warn/20 bg-warn/[0.05] text-warn",
    danger: "border-danger/20 bg-danger/[0.05] text-danger",
    info: "border-brand/20 bg-brand/[0.05] text-brand",
    success: "border-mint/20 bg-mint/[0.05] text-mint",
  } as const;

  const Icon =
    tone === "success" ? Check : tone === "info" ? Info : AlertTriangle;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4",
        styles[tone],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{title}</p>
        <div className="mt-1 text-[11px] leading-5 opacity-80">{body}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function MiniStat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
      <p className="text-[8px] uppercase tracking-[0.16em] text-paper-mute">
        {label}
      </p>
      <p
        className={cn(
          "tabular mt-1.5 truncate font-mono text-sm",
          tone === "mint"
            ? "text-mint"
            : tone === "warn"
              ? "text-warn"
              : tone === "danger"
                ? "text-danger"
                : "text-paper",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function KeyValueRow({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-paper/[0.06] py-2 last:border-0">
      <span className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
        {label}
      </span>
      <span
        className={cn(
          "max-w-[62%] truncate text-right font-mono text-[10px]",
          tone === "mint"
            ? "text-mint"
            : tone === "warn"
              ? "text-warn"
              : tone === "danger"
                ? "text-danger"
                : tone === "brand"
                  ? "text-brand"
                  : "text-paper-dim",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function TxBar({
  hash,
  settled,
  href,
  label,
}: {
  hash?: Hash;
  settled: boolean;
  href?: string;
  label?: string;
}) {
  if (!hash || settled) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand/20 bg-brand/[0.05] px-4 py-3 text-[10px] text-brand">
      <span className="inline-flex items-center gap-2">
        <Loader2 className="size-3.5 animate-spin" />
        {label ?? "Waiting for transaction confirmation…"}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold"
        >
          Explorer <ArrowUpRight className="size-3" />
        </a>
      ) : null}
    </div>
  );
}

export function ConnectPrompt({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const { openConnectModal } = useConnectModal();

  return (
    <Panel className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Wallet className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-paper">{title}</p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-paper-mute">
            {body}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={openConnectModal}
        className="btn-ghost h-11 w-full shrink-0 px-5 text-xs sm:w-auto"
      >
        <Wallet className="size-3.5" />
        Connect wallet
      </button>
    </Panel>
  );
}

export function ConsoleSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-3">
      <div className="h-16 animate-pulse rounded-2xl bg-paper/[0.05]" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-3xl bg-paper/[0.04]"
          />
        ))}
      </div>
    </div>
  );
}

