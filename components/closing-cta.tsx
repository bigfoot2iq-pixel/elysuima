import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { LINKS } from "@/lib/config";

export function ClosingCta() {
  return (
    <section className="section-shell pb-16 sm:pb-20" aria-labelledby="closing-title">
      <div className="glass card-sheen relative overflow-hidden rounded-[32px] px-6 py-14 text-center sm:px-10 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand/12 blur-[90px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full bg-mint/10 blur-[100px]"
        />

        <div className="relative">
          <p className="eyebrow justify-center">Welcome to Elyziuma</p>
          <h2
            id="closing-title"
            className="mx-auto mt-6 max-w-3xl font-display text-[clamp(2rem,5.2vw,3.6rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-paper"
          >
            <span className="text-gradient relative inline-block pb-[0.06em]">
              Build together.
            </span>{" "}
            Grow together. Win together.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[13px] leading-7 text-paper-dim">
            2,222 pieces on Elysium, a raffle platform on the way, and an
            ecosystem that only works if we build it together.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/launchpad" className="btn-ink">
              Mint the collection
              <ArrowRight className="size-4" />
            </Link>
            <a
              href={LINKS.x}
              target="_blank"
              rel="noreferrer"
              className="btn-ink-ghost"
            >
              Join on X
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
