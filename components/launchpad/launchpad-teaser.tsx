import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Layers3,
  Sparkles,
  Wallet,
} from "lucide-react";
import { COLLECTION_COVER } from "@/lib/mascots";

export function LaunchpadTeaser() {
  return (
    <section className="section-shell pb-16 sm:pb-24" aria-labelledby="launchpad-teaser">
      <div className="glass card-sheen relative overflow-hidden rounded-[32px]">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 size-72 rounded-full bg-mint/10 blur-[100px]" />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12 lg:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/[0.06] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-brand">
                <Sparkles className="size-3" />
                Launchpad
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-paper/10 bg-paper/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
                <span className="size-1.5 rounded-full bg-mint shadow-[0_0_8px_rgba(125,240,196,0.8)]" />
                Elysium · 99901
              </span>
            </div>

            <h2
              id="launchpad-teaser"
              className="mt-5 max-w-[16ch] font-display text-[clamp(2rem,4.2vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.045em] text-paper"
            >
              The launchpad is <span className="text-gradient">live.</span>
            </h2>
            <p className="mt-4 max-w-xl text-[13px] leading-7 text-paper-dim">
              Mint directly from the Elyziuma collection contract on Elysium.
              The launchpad reads the drop, detects OpenSea SeaDrop, enforces
              the per-wallet limit, and sends every mint straight to your
              wallet.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { icon: Wallet, label: "Non-custodial" },
                { icon: Layers3, label: "ERC-721 & ERC-1155" },
                { icon: Sparkles, label: "SeaDrop ready" },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-paper/[0.08] bg-paper/[0.025] px-3 py-1.5 text-[10px] font-medium text-paper-dim"
                >
                  <item.icon className="size-3 text-brand" />
                  {item.label}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/launchpad" className="btn-ink">
                Explore the mint
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/launchpad#launchpad-faq" className="btn-ink-ghost">
                Launchpad FAQ
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[280px] lg:mx-0 lg:ml-auto">
            <div className="card-sheen glass relative aspect-square overflow-hidden rounded-[26px]">
              <Image
                src={COLLECTION_COVER.image}
                alt={`${COLLECTION_COVER.name} collection artwork`}
                fill
                sizes="(max-width: 1024px) 280px, 280px"
                className="object-cover"
              />
              <div className="absolute inset-x-5 top-5 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.18em] text-paper/60">
                <span>Elyziuma</span>
                <span>2,222</span>
              </div>
              <div className="absolute inset-x-5 bottom-5">
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-brand/80">
                  Elysium mainnet
                </p>
                <p className="mt-1 text-base font-semibold tracking-[-0.02em] text-paper">
                  Elyziuma collection
                </p>
              </div>
            </div>
            <div className="absolute -bottom-3 -right-3 rounded-2xl border border-mint/25 bg-ink/90 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-mint shadow-[0_16px_40px_-18px_rgba(0,0,0,0.9)] backdrop-blur">
              Mint on-chain
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
