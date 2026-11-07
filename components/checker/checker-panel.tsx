"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Loader2,
  Minus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAccountModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { useMintEligibility } from "@/hooks/use-mint-eligibility";
import { LINKS } from "@/lib/config";
import { formatRelative, shortAddress } from "@/lib/format";
import type {
  MintEligibilityResponse,
  MintEligibilityTier,
} from "@/lib/mint-eligibility";
import { cn } from "@/lib/utils";

const RESULT_COPY: Record<
  MintEligibilityTier,
  {
    label: string;
    heading: string;
    body: string;
    stamp: string;
    icon: LucideIcon;
  }
> = {
  gtd: {
    label: "Eligible",
    heading: "GTD Phase Access",
    body: "Congratulations! Your wallet is eligible for the Guaranteed Mint phase.",
    stamp: "GTD",
    icon: Sparkles,
  },
  fcfs: {
    label: "Eligible",
    heading: "FCFS Phase Access",
    body: "Congratulations! Your wallet is eligible for the First Come, First Served phase.",
    stamp: "FCFS",
    icon: Sparkles,
  },
  both: {
    label: "Eligible",
    heading: "Full Mint Access",
    body: "Congratulations! Your wallet is eligible for both GTD and FCFS phases.",
    stamp: "GTD + FCFS",
    icon: Sparkles,
  },
  none: {
    label: "Not eligible",
    heading: "No Allocation Found",
    body: "This wallet is not eligible for the current Elyziuma mint phases",
    stamp: "—",
    icon: Search,
  },
};

const TONE: Record<
  MintEligibilityTier,
  { card: string; glow: string; badge: string; stamp: string }
> = {
  gtd: {
    card: "border-mint/25 bg-mint/[0.045]",
    glow: "bg-mint/15",
    badge: "border-mint/25 bg-mint/[0.08] text-mint",
    stamp: "border-mint/35 bg-mint/[0.08] text-mint",
  },
  fcfs: {
    card: "border-brand/25 bg-brand/[0.045]",
    glow: "bg-brand/15",
    badge: "border-brand/25 bg-brand/[0.08] text-brand",
    stamp: "border-brand/35 bg-brand/[0.08] text-brand",
  },
  both: {
    card: "border-mint/25 bg-gradient-to-br from-mint/[0.06] to-brand/[0.06]",
    glow: "bg-brand/15",
    badge: "border-mint/25 bg-mint/[0.08] text-mint",
    stamp: "border-brand/35 bg-brand/[0.08] text-brand",
  },
  none: {
    card: "border-paper/[0.09] bg-paper/[0.025]",
    glow: "bg-paper/5",
    badge: "border-paper/10 bg-paper/[0.04] text-paper-dim",
    stamp: "border-paper/10 bg-paper/[0.03] text-paper-mute",
  },
};

const PHASE_PREVIEW: {
  key: MintEligibilityTier;
  label: string;
  title: string;
  copy: string;
  tone: string;
}[] = [
  {
    key: "gtd",
    label: "GTD",
    title: "Guaranteed Mint",
    copy: "Your spot is reserved.",
    tone: "border-mint/25 bg-mint/[0.04] text-mint",
  },
  {
    key: "fcfs",
    label: "FCFS",
    title: "First Come",
    copy: "Mint early while open.",
    tone: "border-brand/25 bg-brand/[0.04] text-brand",
  },
  {
    key: "both",
    label: "GTD + FCFS",
    title: "Full Access",
    copy: "Both phases unlocked.",
    tone: "border-mint/25 bg-gradient-to-br from-mint/[0.05] to-brand/[0.05] text-brand",
  },
  {
    key: "none",
    label: "—",
    title: "No Allocation",
    copy: "Not on either list.",
    tone: "border-paper/[0.08] bg-paper/[0.02] text-paper-mute",
  },
];

const emptySubscribe = () => () => {};

/** Wagmi reconnects on the client, so avoid guessing the wallet state on SSR. */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function CheckerPanel() {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const query = useMintEligibility(isConnected ? address : undefined);

  const connected = mounted && isConnected && Boolean(address);
  const retry = () => void query.refetch();

  return (
    <section
      aria-labelledby="checker-heading"
      className="glass card-sheen relative flex h-full flex-col overflow-hidden rounded-[24px] p-4"
    >
      <header className="flex items-center justify-between gap-3 border-b border-paper/[0.07] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
              Wallet check
            </p>
            <h2
              id="checker-heading"
              className="mt-0.5 text-lg font-semibold tracking-[-0.03em] text-paper"
            >
              Your mint access
            </h2>
          </div>
        </div>

        {connected && address ? (
          <WalletChip address={address} onOpen={openAccountModal} />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-paper/10 bg-paper/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-mute">
            <span className="size-1.5 rounded-full bg-paper-mute" />
            Not connected
          </span>
        )}
      </header>

      <div className="flex flex-1 flex-col justify-center py-4">
        {!mounted ? (
          <PanelSkeleton />
        ) : !connected || !address ? (
          <DisconnectedState />
        ) : query.isPending ? (
          <CheckingState address={address} />
        ) : query.isError ? (
          <ErrorState message={query.error?.message} />
        ) : query.data ? (
          <ResultState data={query.data} />
        ) : (
          <PanelSkeleton />
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2.5 border-t border-paper/[0.07] pt-3">
        {!mounted ? (
          <button
            type="button"
            disabled
            className="btn-primary w-full px-5 text-xs sm:w-auto"
          >
            <Wallet className="size-4" />
            Connect wallet
          </button>
        ) : !connected ? (
          <button
            type="button"
            onClick={openConnectModal}
            disabled={!openConnectModal}
            className="btn-primary w-full px-5 text-xs sm:w-auto"
          >
            <Wallet className="size-4" />
            Connect wallet
          </button>
        ) : query.isPending ? (
          <button
            type="button"
            disabled
            className="btn-primary w-full px-5 text-xs sm:w-auto"
          >
            <Loader2 className="size-4 animate-spin" />
            Checking…
          </button>
        ) : query.isError ? (
          <button
            type="button"
            onClick={retry}
            disabled={query.isFetching}
            className="btn-primary w-full px-5 text-xs sm:w-auto"
          >
            <RefreshCw
              className={cn("size-4", query.isFetching && "animate-spin")}
            />
            {query.isFetching ? "Retrying…" : "Try again"}
          </button>
        ) : (
          <button
            type="button"
            onClick={retry}
            disabled={query.isFetching}
            className="btn-primary w-full px-5 text-xs sm:w-auto"
          >
            <RefreshCw
              className={cn("size-4", query.isFetching && "animate-spin")}
            />
            {query.isFetching ? "Checking…" : "Recheck"}
          </button>
        )}

        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-mute">
          No signature · No gas · Read-only
        </p>
      </footer>
    </section>
  );
}

function WalletChip({
  address,
  onOpen,
}: {
  address: Address;
  onOpen?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      aria-label={`Connected wallet ${address}. Change wallet.`}
      className="inline-flex items-center gap-1.5 rounded-full border border-paper/10 bg-paper/[0.04] px-2.5 py-1.5 font-mono text-[11px] text-paper-dim transition hover:border-brand/40 hover:text-paper disabled:cursor-default"
    >
      <span className="size-1.5 rounded-full bg-mint shadow-[0_0_8px_rgba(125,240,196,0.8)]" />
      {shortAddress(address, 4)}
      <ChevronDown className="size-2.5 text-paper-mute" />
    </button>
  );
}

function DisconnectedState() {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-mute">
          Possible results
        </p>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper-mute">
          <ShieldCheck className="size-2.5 text-brand" />
          Read-only
        </span>
      </div>

      <PhaseGuide className="mt-2" />

      <p className="mt-3 text-center text-[12px] leading-5 text-paper-mute">
        Connect a wallet to see which phase you qualify for.
      </p>
    </div>
  );
}

function CheckingState({ address }: { address: Address }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-2 text-[13px] text-paper-dim">
        <Loader2 className="size-3.5 animate-spin text-brand" />
        Checking the GTD and FCFS lists…
      </div>

      <PhaseGuide className="mt-3 opacity-60" />

      <p className="mt-3 text-center text-[11px] leading-5 text-paper-mute">
        Reading{" "}
        <span className="font-mono text-paper-dim">
          {shortAddress(address)}
        </span>
        . The first check can take a few seconds.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message?: string }) {
  const friendly =
    message && message.toLowerCase().includes("too many")
      ? message
      : "The allowlist is temporarily unavailable. Your wallet was not marked as ineligible.";

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-warn/25 bg-warn/[0.04] p-4 text-center"
    >
      <span className="mx-auto flex size-9 items-center justify-center rounded-lg border border-warn/30 bg-warn/10 text-warn">
        <AlertTriangle className="size-4" />
      </span>
      <h3 className="mt-2 text-base font-semibold text-paper">
        Couldn&apos;t check the lists
      </h3>
      <p className="mt-1 text-[12px] leading-5 text-paper-mute">{friendly}</p>
    </div>
  );
}

function ResultState({ data }: { data: MintEligibilityResponse }) {
  const copy = RESULT_COPY[data.tier];
  const tone = TONE[data.tier];
  const eligible = data.tier !== "none";
  const Icon = copy.icon;

  return (
    <div key={data.tier} className="animate-rise">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "relative overflow-hidden rounded-xl border p-4",
          tone.card,
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -right-8 -top-12 size-40 rounded-full blur-[60px]",
            tone.glow,
          )}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]",
                tone.badge,
              )}
            >
              <Icon aria-hidden="true" className="size-2.5" />
              {copy.label}
            </span>

            <h3 className="mt-2 font-display text-[clamp(1.5rem,3.2vw,2rem)] font-extrabold leading-[1] tracking-[-0.04em] text-paper">
              {copy.heading}
            </h3>
            <p className="mt-1.5 max-w-md text-[13px] leading-5 text-paper-dim">
              {copy.body}
            </p>
          </div>

          <span
            aria-hidden="true"
            className={cn(
              "hidden shrink-0 rotate-[-4deg] rounded-lg border-2 px-2.5 py-1.5 font-display text-[14px] font-extrabold uppercase leading-none tracking-[0.08em] sm:block",
              tone.stamp,
            )}
          >
            {copy.stamp}
          </span>
        </div>

        <div className="relative mt-3 flex flex-wrap gap-1.5">
          <PhaseChip label="GTD" active={data.gtd} />
          <PhaseChip label="FCFS" active={data.fcfs} />
        </div>

        {data.tier === "none" ? (
          <p className="relative mt-2.5 rounded-lg border border-beak/20 bg-beak/[0.05] px-2.5 py-1.5 text-[11px] leading-5 text-paper-dim">
            Holding a Kalos Genesis NFT? You are automatically eligible for
            FCFS — no wallet verification needed.
          </p>
        ) : null}

        <div className="relative mt-3 flex flex-wrap items-center gap-2 border-t border-paper/[0.08] pt-3">
          {eligible ? (
            <Link
              href="/launchpad"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-brand/25 bg-brand/[0.06] px-3 text-[13px] font-semibold text-brand transition hover:bg-brand/10"
            >
              Open launchpad
              <ArrowRight className="size-3" />
            </Link>
          ) : (
            <a
              href={LINKS.x}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-paper/10 bg-paper/[0.03] px-3 text-[13px] font-semibold text-paper-dim transition hover:border-brand/40 hover:text-brand"
            >
              Follow on X
              <ArrowUpRight className="size-3" />
            </a>
          )}

          <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper-mute">
            <Clock3 className="size-2.5" />
            {formatRelative(Math.floor(data.checkedAt / 1000))}
          </span>
        </div>
      </div>
    </div>
  );
}

function PhaseGuide({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-1.5 sm:grid-cols-4", className)}>
      {PHASE_PREVIEW.map((phase) => (
        <div
          key={phase.key}
          className={cn("rounded-lg border p-2", phase.tone)}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
              {phase.label}
            </span>
            <span className="size-1 rounded-full bg-current" />
          </div>
          <p className="mt-1 text-[13px] font-semibold leading-4 text-paper">
            {phase.title}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-paper-mute">
            {phase.copy}
          </p>
        </div>
      ))}
    </div>
  );
}

function PhaseChip({ label, active }: { label: string; active: boolean }) {
  const activeClass =
    label === "FCFS"
      ? "border-brand/25 bg-brand/[0.07] text-brand"
      : "border-mint/25 bg-mint/[0.07] text-mint";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
        active
          ? activeClass
          : "border-paper/[0.08] bg-paper/[0.02] text-paper-mute",
      )}
    >
      {active ? (
        <Check aria-hidden="true" className="size-2.5" />
      ) : (
        <Minus aria-hidden="true" className="size-2.5" />
      )}
      {label}
      <span className="sr-only">{active ? "eligible" : "not eligible"}</span>
    </span>
  );
}

function PanelSkeleton() {
  return (
    <div className="animate-pulse space-y-2.5 py-2">
      <div className="h-3 w-24 rounded-full bg-paper/[0.06]" />
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-16 rounded-lg bg-paper/[0.04]" />
        ))}
      </div>
      <div className="h-2.5 w-2/3 rounded-full bg-paper/[0.04]" />
    </div>
  );
}
