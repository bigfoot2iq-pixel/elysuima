import Link from "next/link";
import { ArrowRight, ArrowUpRight, Box, Droplet, Waves } from "lucide-react";
import { BRIDGES, TESTNET_FAUCET } from "@/lib/bridges";

const ICONS = {
  waves: Waves,
  box: Box,
  droplet: Droplet,
} as const;

const STEPS = [
  {
    number: "01",
    title: "Pick a bridge",
    body: "Open ElysPump or Boxa from the cards below.",
  },
  {
    number: "02",
    title: "Send your assets",
    body: "Choose the source chain and amount, then confirm in your wallet.",
  },
  {
    number: "03",
    title: "Land on Elysium",
    body: "Your assets arrive on Elysium, ready for the Elyziuma ecosystem.",
  },
];

const RESOURCES = [...BRIDGES, TESTNET_FAUCET];

export function BridgeContent() {
  return (
    <>
      {/* Intro — the copy answers the first question a newcomer has. */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="animate-breathe absolute left-1/2 top-[-18%] size-[440px] -translate-x-1/2 rounded-full bg-brand/[0.15] blur-[120px]" />
          <div className="absolute -left-32 top-1/3 size-[340px] rounded-full bg-beak/[0.07] blur-[120px]" />
        </div>

        <div className="section-shell relative pb-12 pt-14 sm:pt-20">
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="animate-rise max-w-2xl">
              <p className="eyebrow">Get on Elysium</p>
              <h1 className="mt-6 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-paper">
                Bridge to{" "}
                <span className="text-gradient">Elysium</span>
              </h1>
              <p className="mt-6 text-[17px] font-medium leading-8 text-paper sm:text-[18px]">
                New to Elysium? No worries.
              </p>
              <p className="mt-3 max-w-xl text-[13px] leading-7 text-paper-dim">
                Before joining Elyziuma, you can bridge your assets to the
                Elysium network with one of the following bridges. Testing on
                testnet? Grab gas from the faucet below.
              </p>
            </div>

            {/* The route, in three moves. */}
            <div className="ink-panel animate-rise relative overflow-hidden rounded-[28px] p-6 sm:p-7 [animation-delay:120ms]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-brand/[0.10] blur-[80px]"
              />
              <div className="relative flex items-center justify-between gap-4">
                <p className="eyebrow">The route</p>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper-mute">
                  3 steps
                </span>
              </div>

              <ol className="relative mt-6 space-y-4">
                {STEPS.map((step, index) => (
                  <li key={step.number} className="flex gap-4">
                    <span className="flex flex-col items-center">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-brand/25 bg-brand/10 font-mono text-[10px] text-brand">
                        {step.number}
                      </span>
                      {index < STEPS.length - 1 ? (
                        <span className="mt-1 w-px flex-1 bg-paper/[0.10]" />
                      ) : null}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold tracking-[-0.02em] text-paper">
                        {step.title}
                      </span>
                      <span className="mt-1 block text-[12px] leading-6 text-paper-dim">
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* The bridges themselves, plus testnet gas. */}
      <section
        className="section-shell pb-16 sm:pb-24"
        aria-label="Bridges and faucet"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.map((resource, index) => {
            const Icon = ICONS[resource.icon];

            return (
              <article
                key={resource.key}
                className="group ink-panel animate-rise relative overflow-hidden rounded-[28px] p-6 transition hover:border-brand/40 sm:p-8"
                style={{ animationDelay: `${120 + index * 90}ms` }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand/[0.10] blur-[70px] transition-opacity duration-300 group-hover:bg-brand/[0.16]"
                />

                <div className="relative flex items-start justify-between gap-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-ink">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper-mute">
                    {resource.label}
                  </span>
                </div>

                <h2 className="relative mt-6 font-display text-2xl font-extrabold tracking-[-0.03em] text-paper">
                  {resource.name}
                </h2>
                <p className="relative mt-2 max-w-sm text-[12px] leading-6 text-paper-dim">
                  {resource.description}
                </p>

                <div className="relative mt-7 flex flex-wrap items-center gap-4">
                  <a
                    href={resource.href}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ink"
                  >
                    Open {resource.name}
                    <ArrowUpRight className="size-4" />
                  </a>
                  <span className="font-mono text-[10px] text-paper-mute">
                    {resource.host}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Closing — the journey starts once the assets land. */}
      <section className="section-shell pb-20 sm:pb-28">
        <div className="glass card-sheen relative overflow-hidden rounded-[32px] px-6 py-14 text-center sm:px-10 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand/12 blur-[90px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full bg-mint/10 blur-[100px]"
          />

          <div className="relative">
            <p className="mx-auto max-w-xl text-[13px] leading-7 text-paper-dim">
              Once you&apos;re on Elysium, you&apos;ll be ready to explore the
              ecosystem and join the Elyziuma journey.
            </p>
            <h2 className="mt-6 font-display text-[clamp(1.8rem,4.6vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-paper">
              <span className="text-gradient">Bridge.</span> Explore. Build with
              us.
            </h2>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/launchpad" className="btn-ink">
                Mint the collection
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/" className="btn-ink-ghost">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
