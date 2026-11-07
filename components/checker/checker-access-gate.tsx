"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  ArrowLeft,
  LockKeyhole,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useAccountModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { isCheckerAddress } from "@/lib/checker-access";
import { shortAddress } from "@/lib/format";
import { CheckerContent } from "./checker-content";

const emptySubscribe = () => () => {};

/** Wagmi reconnects on the client, so avoid guessing the wallet state on SSR. */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function CheckerAccessGate() {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();

  if (!mounted) return <GateSkeleton />;
  if (isConnected && isCheckerAddress(address)) return <CheckerContent />;

  const wrongWallet = Boolean(isConnected && address);

  return (
    <section className="section-shell flex items-center justify-center py-10">
      <div className="glass relative w-full max-w-md overflow-hidden rounded-[24px] p-6 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-brand/10 blur-[70px]"
        />

        <span className="relative mx-auto flex size-12 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand">
          <LockKeyhole className="size-5" />
        </span>

        <p className="relative mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
          Private checker
        </p>
        <h1 className="relative mt-2 font-display text-[clamp(1.7rem,4vw,2.3rem)] font-extrabold leading-[1] tracking-[-0.04em] text-paper">
          Authorized wallet only.
        </h1>
        <p className="relative mt-2 text-[13px] leading-6 text-paper-dim">
          {wrongWallet
            ? "This wallet doesn't have access to the checker. Switch to the authorized wallet to continue."
            : "Connect the authorized wallet to open the mint checker."}
        </p>

        {wrongWallet && address ? (
          <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full border border-warn/25 bg-warn/[0.06] px-2.5 py-1 font-mono text-[10px] text-warn">
            <span className="size-1.5 rounded-full bg-warn" />
            {shortAddress(address, 6)}
          </p>
        ) : null}

        <div className="relative mt-5 flex flex-col gap-2">
          {wrongWallet ? (
            <button
              type="button"
              onClick={() => openAccountModal?.()}
              disabled={!openAccountModal}
              className="btn-primary w-full px-5 text-xs"
            >
              <Wallet className="size-4" />
              Switch wallet
            </button>
          ) : (
            <button
              type="button"
              onClick={openConnectModal}
              disabled={!openConnectModal}
              className="btn-primary w-full px-5 text-xs"
            >
              <Wallet className="size-4" />
              Connect wallet
            </button>
          )}

          <Link href="/" className="btn-ghost h-11 w-full text-xs">
            <ArrowLeft className="size-3.5" />
            Back to site
          </Link>
        </div>

        <p className="relative mt-4 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-paper-mute">
          <ShieldCheck className="size-3 text-brand" />
          Authorized wallet only · No signature · No gas
        </p>
      </div>
    </section>
  );
}

function GateSkeleton() {
  return (
    <section className="section-shell flex items-center justify-center py-10">
      <div className="glass w-full max-w-md animate-pulse rounded-[24px] p-6">
        <div className="mx-auto size-12 rounded-2xl bg-paper/[0.06]" />
        <div className="mx-auto mt-4 h-3 w-24 rounded-full bg-paper/[0.06]" />
        <div className="mx-auto mt-3 h-8 w-2/3 rounded-full bg-paper/[0.06]" />
        <div className="mx-auto mt-3 h-3 w-full rounded-full bg-paper/[0.04]" />
        <div className="mx-auto mt-1.5 h-3 w-4/5 rounded-full bg-paper/[0.04]" />
        <div className="mt-5 h-11 rounded-full bg-paper/[0.05]" />
        <div className="mt-2 h-11 rounded-full bg-paper/[0.04]" />
      </div>
    </section>
  );
}
