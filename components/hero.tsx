import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { LINKS } from "@/lib/config";
import { MASCOTS, getMascot, HERO_MASCOT_ID, MASCOT_GLOWS } from "@/lib/mascots";
import { NetworkBadge } from "./network-badge";

const FACTS: { label?: string; value: string }[] = [
  { label: "Collection", value: "2,222 pieces" },
  { label: "Minted on", value: "Elysium testnet" },
  { value: "ERC-721" },
];

export function Hero() {
  const mascot = getMascot(HERO_MASCOT_ID);

  return (
    <section className="relative overflow-hidden">
      {/* Atmosphere: a warm halo behind the character and a cool wash opposite,
          so the two-column split has a deliberate light direction. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="animate-breathe absolute left-1/2 top-[22%] size-[420px] -translate-x-1/2 rounded-full bg-brand/[0.16] blur-[110px] lg:left-[72%]" />
        <div className="absolute -left-32 top-1/3 size-[380px] rounded-full bg-beak/[0.09] blur-[120px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
      </div>

      <div className="section-shell relative grid items-center gap-12 pb-16 pt-10 sm:pt-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:pb-20 lg:pt-16">
        {/* Copy column */}
        <div className="animate-rise">
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow">2,222-piece collection</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/25 bg-mint/[0.07] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-mint">
              <span className="live-dot" />
              Mint live
            </span>
          </div>

          <h1 className="mt-6 whitespace-nowrap font-display text-[clamp(1.85rem,4.8vw,3.9rem)] font-extrabold leading-[0.9] tracking-[-0.045em] text-paper">
            Meet the{" "}
            <span className="relative pb-[0.06em]">
              {/* Inline-block so the underline tracks the word, not the column. */}
              <span className="relative inline-block">
                <span className="text-gradient">Elyziuma</span>
                {/* Beak-red underline stroke, like a marker swipe under the word.
                    Sits below the descender so it never strikes through the "g". */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 300 12"
                  preserveAspectRatio="none"
                  className="absolute bottom-0 left-0 h-[0.16em] w-full text-beak/70"
                >
                  <path
                    d="M2 8C58 3 132 2 298 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </span>
          </h1>

          <p className="mt-6 text-[15px] leading-7 text-paper-dim sm:text-base">
            Elyziuma is a 2,222-piece NFT collection built on Elysium. Five
            characters, each holding a different job in the ecosystem — the
            guardian, the operator, the runner, the reader, the builder. Own
            the one that matches how you move.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/launchpad" className="btn-ink">
              Mint the collection
              <ArrowRight className="size-4" />
            </Link>
            <a
              href={LINKS.bridge}
              target="_blank"
              rel="noreferrer"
              className="btn-ink-ghost"
            >
              Bridge HYPE
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>

          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-paper/[0.07] pt-5">
            {FACTS.map((fact) => (
              <div key={fact.value} className="flex flex-col justify-end">
                {fact.label ? (
                  <dt className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
                    {fact.label}
                  </dt>
                ) : null}
                <dd className="mt-2 font-mono text-[11px] leading-5 text-paper sm:text-xs">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Art column — the character sits in a hard-edged frame that reads as
            a display case, with the rest of the cast stacked below it. */}
        <div className="animate-rise [animation-delay:120ms]">
          <div className="relative mx-auto w-full max-w-[380px] lg:mx-0 lg:ml-auto">
            {/* Offset accent plate behind the frame, hard-edged like the art. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-3 -bottom-3 -z-10 h-full rounded-[24px] border-2 border-beak/25"
            />

            <figure className="ink-panel eye-glow sticker relative overflow-hidden rounded-[24px]">
              {/* Framing ticks, echoing the art's card labels. The network mark
                  replaces the old plain-text chain label. */}
              <div className="absolute inset-x-4 top-3 z-20 flex items-start justify-between gap-3">
                <span className="pt-1.5 font-mono text-[8px] uppercase tracking-[0.2em] text-paper/55">
                  Elyziuma
                </span>
                <NetworkBadge />
              </div>

              {/* The source art is square, so the frame stays square — no cropping,
                  no upscaling. The character sits whole inside the case. */}
              <div className="relative aspect-square w-full overflow-hidden">
                {/* Orbital ring + travelling node */}
                <div
                  aria-hidden="true"
                  className="absolute inset-[18%] rounded-full border border-brand/15"
                />
                <div
                  aria-hidden="true"
                  className="animate-spin-slow absolute inset-[30%] rounded-full border border-dashed border-paper/[0.09]"
                />
                <div aria-hidden="true" className="absolute inset-[30%]">
                  <span className="absolute -top-[3px] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand-soft shadow-[0_0_14px_rgba(124,216,242,0.9)]" />
                </div>

                <Image
                  src={mascot.image}
                  alt={`${mascot.name} — ${mascot.title}, the ${mascot.role} of the Elyziuma collection`}
                  fill
                  preload
                  sizes="(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 380px"
                  className="object-cover object-[50%_38%]"
                />

                {/* Bottom scrim so the nameplate stays legible over the art. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink via-ink/70 to-transparent"
                />
              </div>

              <figcaption className="relative z-20 -mt-12 flex items-end justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-brand">
                    {mascot.rarity}
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-extrabold tracking-[-0.03em] text-paper">
                    {mascot.name}
                  </p>
                  <p className="mt-1 text-[11px] text-paper-dim">
                    {mascot.title} · {mascot.role}
                  </p>
                </div>
                <Link
                  href="/launchpad"
                  aria-label={`Mint ${mascot.name} in the Elyziuma collection`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand transition hover:bg-brand hover:text-ink"
                >
                  <Sparkles className="size-4" />
                </Link>
              </figcaption>
            </figure>

            {/* The rest of the cast, as a compact lineup rail. */}
            <ul className="mt-3 flex items-center gap-2">
              {MASCOTS.filter((item) => item.id !== mascot.id).map((item, index) => (
                <li
                  key={item.id}
                  className="animate-rise flex-1"
                  style={{ animationDelay: `${220 + index * 70}ms` }}
                >
                  <div className="group ink-panel relative overflow-hidden rounded-xl p-1.5 transition hover:border-brand/40">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: MASCOT_GLOWS[item.accent] }}
                    />
                    <div className="relative aspect-square overflow-hidden rounded-lg">
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={120}
                        height={120}
                        loading="lazy"
                        className="size-full object-cover object-[50%_30%]"
                      />
                    </div>
                    <p className="relative mt-1.5 truncate text-center font-mono text-[8px] uppercase tracking-[0.14em] text-paper-dim">
                      {item.name}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="section-shell relative">
        <div className="flex items-center justify-between gap-4 pb-10">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper-mute">
            2,222 pieces · Five characters
          </p>
          <p className="hidden text-[10px] text-paper-mute sm:block">
            Minted on Elysium. No custody.
          </p>
        </div>
      </div>
    </section>
  );
}