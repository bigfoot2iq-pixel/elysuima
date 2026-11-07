"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { CheckerPanel } from "./checker-panel";

export function CheckerContent() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-48"
        >
          <div className="absolute left-1/2 top-[-150px] size-[420px] -translate-x-1/2 rounded-full bg-brand/[0.12] blur-[100px]" />
          <div className="absolute -left-24 top-0 size-[220px] rounded-full bg-beak/[0.05] blur-[90px]" />
        </div>

        <div className="section-shell relative pb-4 pt-6 sm:pt-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-paper/10 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.8)]">
                <Image
                  src="/collection/elyziuma.jpg"
                  alt=""
                  fill
                  priority
                  sizes="48px"
                  className="object-cover"
                />
              </span>

              <div>
                <span className="eyebrow">Mint checker</span>
                <h1 className="mt-1.5 font-display text-[clamp(1.8rem,3.8vw,2.6rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-paper">
                  Check your{" "}
                  <span className="text-gradient">mint access.</span>
                </h1>
              </div>
            </div>

            <p className="max-w-sm text-[13px] leading-5 text-paper-dim sm:text-right">
              Connect the wallet you plan to mint with. We read the GTD and FCFS
              lists — no signature, no gas.
            </p>
          </div>
        </div>
      </section>

      <section
        className="section-shell relative pb-6"
        aria-label="Mint eligibility checker"
      >
        <div className="mx-auto grid max-w-5xl items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <CheckerPanel />

          <aside className="glass flex flex-col rounded-[24px] p-4">
            <section>
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-beak/30 bg-beak/10 text-beak">
                  <Flame className="size-4" />
                </span>
                <h2 className="text-base font-semibold text-paper">
                  Kalos Genesis Holders
                </h2>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-paper-dim">
                All Kalos Genesis holders are automatically eligible for the
                FCFS phase. No wallet verification is required.
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-beak/25 bg-beak/[0.06] px-2.5 py-1 text-[11px] font-semibold text-beak">
                Your WL spot is secured. 🔥
              </p>
            </section>

            <div className="my-3 h-px bg-paper/[0.07]" />

            <section>
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand">
                  <Sparkles className="size-4" />
                </span>
                <h2 className="text-base font-semibold text-paper">
                  Your Journey Doesn&apos;t End Here.
                </h2>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-paper-dim">
                Mint your Elyziuma NFT and keep holding. There may be more
                waiting for you beyond the mint. 👀
              </p>
              <Link
                href="/launchpad"
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-paper/10 bg-paper/[0.03] text-[13px] font-semibold text-paper transition hover:border-brand/40 hover:bg-brand/[0.08]"
              >
                Open the launchpad
                <ArrowRight className="size-3" />
              </Link>
            </section>
          </aside>
        </div>

        <p className="mx-auto mt-3 max-w-5xl text-center font-mono text-[10px] uppercase tracking-[0.16em] text-paper-mute/70">
          Informational only · The launchpad contract remains the final authority
        </p>
      </section>
    </>
  );
}
