import Link from "next/link";
import { ArrowRight, ArrowUpRight, Droplet, Zap } from "lucide-react";
import { getChainExplorerUrl } from "@/lib/chains";
import { FAUCETS } from "@/lib/faucets";
import { InAppFaucet } from "./in-app-faucet";

const ICONS = {
  droplet: Droplet,
  zap: Zap,
} as const;

const STEPS = [
  {
    number: "01",
    title: "Add Elysium Testnet",
    body: "Switch your wallet to chain 99801. HYPE is the gas token.",
  },
  {
    number: "02",
    title: "Open a faucet",
    body: "Connect your wallet or paste your address, then complete the check.",
  },
  {
    number: "03",
    title: "Use it on chain",
    body: "Testnet HYPE covers gas and the community claim fee, plus mints and anything else you try.",
  },
];

const FACTS = [
  { label: "Network", value: "Elysium Testnet" },
  { label: "Chain ID", value: "99801" },
  { label: "Gas token", value: "HYPE" },
];

const EXPLORER = getChainExplorerUrl(99801);

export function FaucetContent() {
  return (
    <>
      {/* Intro — what the faucet is for and what it costs. */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="animate-breathe absolute left-1/2 top-[-18%] size-[440px] -translate-x-1/2 rounded-full bg-brand/[0.15] blur-[120px]" />
          <div className="absolute -left-32 top-1/3 size-[340px] rounded-full bg-beak/[0.07] blur-[120px]" />
        </div>

        <div className="section-shell relative pb-12 pt-14 sm:pt-20">
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="animate-rise max-w-2xl">
              <p className="eyebrow">Elysium faucet</p>
              <h1 className="mt-6 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-paper">
                Get testnet <span className="text-gradient">HYPE</span>
              </h1>
              <p className="mt-6 text-[17px] font-medium leading-8 text-paper sm:text-[18px]">
                Every move on Elysium needs a little gas.
              </p>
              <p className="mt-3 max-w-xl text-[13px] leading-7 text-paper-dim">
                Claim testnet HYPE from the wallet you already have connected,
                or use one of the official faucets below. It covers the claim
                fees, collection mints, and anything else you try on chain
                99801.
              </p>
            </div>

            {/* The path from empty wallet to usable gas, in three moves. */}
            <div className="ink-panel animate-rise relative overflow-hidden rounded-[28px] p-6 sm:p-7 [animation-delay:120ms]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-brand/[0.10] blur-[80px]"
              />
              <div className="relative flex items-center justify-between gap-4">
                <p className="eyebrow">How it works</p>
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

      <InAppFaucet />

      {/* The faucets themselves. */}
      <section
        className="section-shell pb-16 sm:pb-24"
        aria-label="Elysium faucets"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {FAUCETS.map((faucet, index) => {
            const Icon = ICONS[faucet.icon];

            return (
              <article
                key={faucet.key}
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
                    {faucet.label}
                  </span>
                </div>

                <h2 className="relative mt-6 font-display text-2xl font-extrabold tracking-[-0.03em] text-paper">
                  {faucet.name}
                </h2>
                <p className="relative mt-2 max-w-sm text-[12px] leading-6 text-paper-dim">
                  {faucet.description}
                </p>

                <div className="relative mt-7 flex flex-wrap items-center gap-4">
                  <a
                    href={faucet.href}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ink"
                  >
                    Open {faucet.name}
                    <ArrowUpRight className="size-4" />
                  </a>
                  <span className="font-mono text-[10px] text-paper-mute">
                    {faucet.host}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        {/* Network details, for wallets that ask for them. */}
        <div className="ink-panel relative mt-4 overflow-hidden rounded-[28px] p-6 sm:p-8">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow">Network details</p>
              <p className="mt-3 max-w-md text-[12px] leading-6 text-paper-dim">
                Adding Elysium Testnet takes one network entry. Use these values
                if your wallet asks for them.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
              {FACTS.map((fact) => (
                <div key={fact.label}>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper-mute">
                    {fact.label}
                  </dt>
                  <dd className="mt-1.5 font-mono text-[11px] text-paper">
                    {fact.value}
                  </dd>
                </div>
              ))}
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper-mute">
                  Explorer
                </dt>
                <dd className="mt-1.5">
                  <a
                    href={EXPLORER}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-paper transition hover:text-brand"
                  >
                    Testnet
                    <ArrowUpRight className="size-3" />
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <p className="relative mt-6 max-w-2xl border-t border-paper/[0.07] pt-5 text-[11px] leading-6 text-paper-mute">
            Faucets rate-limit by wallet. If a request fails, wait out the
            cooldown or try the other faucet. Testnet HYPE has no real value.
          </p>
        </div>
      </section>

      {/* Closing — the faucet is the first step, not the destination. */}
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
              With gas in the tank, you&apos;re ready to mint the collection and
              explore the Elyziuma ecosystem on Elysium.
            </p>
            <h2 className="mt-6 font-display text-[clamp(1.8rem,4.6vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-paper">
              <span className="text-gradient">Gas up.</span> Explore. Build with
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
