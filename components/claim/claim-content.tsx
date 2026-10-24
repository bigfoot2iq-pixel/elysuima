import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  Fuel,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ClaimCard } from "@/components/claim-card";
import { EligibilityPanel } from "@/components/eligibility-panel";
import { MascotAvatarRow } from "@/components/mascot-avatar";
import { LINKS } from "@/lib/config";

const FACTS = [
  { label: "Daily drop", value: "100 ELYZ" },
  { label: "Cooldown", value: "24 hours" },
  { label: "Network", value: "Elysium · 99901" },
];

const STEPS = [
  {
    title: "Hold the threshold",
    body: "Keep at least 0.001 ETH or HYPE on Hyperliquid, HyperEVM, Ethereum, Base, or Ink. The check is read from your address, not from an account.",
  },
  {
    title: "Connect and switch",
    body: "Connect any EVM wallet. The claim card asks your wallet to switch to Elysium chain 99901 automatically if you are elsewhere.",
  },
  {
    title: "Authorize the claim",
    body: "The site signs a short-lived EIP-712 authorization bound to your wallet. You approve it once in your wallet.",
  },
  {
    title: "Receive ELYZ",
    body: "The claim contract transfers your ELYZ on Elysium. Gas is paid in HYPE, so keep a small balance for fees.",
  },
];

const FAQS = [
  {
    question: "Why the 0.001 threshold?",
    answer:
      "The threshold is a cheap anti-sybil check. It keeps bots out without asking for meaningful capital. Any one of the five supported chains qualifies, so you do not need to split funds across them.",
  },
  {
    question: "How long is the cooldown?",
    answer:
      "24 hours. The timer starts the moment your claim transaction is confirmed on-chain. When the ring fills back up, you can claim again.",
  },
  {
    question: "What gas do I pay?",
    answer:
      "Gas is paid in HYPE, the native currency of Elysium. The claim amount itself is free. Bridge a small amount of HYPE so your wallet can cover the transaction fee.",
  },
  {
    question: "Is the claim custodial?",
    answer:
      "No. The claim contract transfers tokens directly to your wallet. Elyziuma never takes custody of your funds or your authorization.",
  },
  {
    question: "Why is a chain unavailable?",
    answer:
      "Public RPCs rate-limit and occasionally time out. An unavailable chain does not disqualify you as long as one of the other four qualifies. Retry the check if everything is unreachable.",
  },
];

export function ClaimContent() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="orb animate-float absolute -right-16 -top-12 hidden size-[440px] bg-brand/10 blur-[100px] lg:block" />
          <div className="orb animate-float-slow absolute -left-28 top-1/3 size-[340px] bg-brand-deep/15 blur-[100px]" />
          <div className="absolute right-[6%] top-16 hidden size-[420px] rounded-full border border-brand/[0.08] lg:block">
            <div className="absolute inset-12 rounded-full border border-brand/[0.06]" />
            <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_18px_rgba(52,183,221,0.9)]" />
          </div>
        </div>

        <div className="section-shell relative grid gap-12 pb-14 pt-12 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-20">
          <div className="animate-rise">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-mint/20 bg-mint/[0.05] px-3 py-1.5">
                <span className="live-dot" />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-mint">
                  Daily claim
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-paper/10 bg-paper/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
                Elysium · 99901
              </span>
            </div>

            <h1 className="mt-6 max-w-[14ch] text-[clamp(2.6rem,6vw,5rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-paper">
              Your daily <span className="text-gradient">ELYZ</span>, on
              Elysium.
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-7 text-paper-dim sm:text-base">
              Hold at least{" "}
              <span className="font-mono text-paper">0.001 ETH or HYPE</span> on
              Hyperliquid, HyperEVM, Ethereum, Base, or Ink, then claim{" "}
              <span className="font-mono text-paper">100 ELYZ</span> every 24
              hours. No sign-up, no account — just your wallet.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {[
                { icon: ShieldCheck, label: "0.001 ETH / HYPE threshold" },
                { icon: Sparkles, label: "5 chains accepted" },
                { icon: Clock3, label: "24h cooldown" },
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

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#eligibility" className="btn-primary px-6">
                Check eligibility
              </a>
              <a
                href={LINKS.bridge}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost px-5"
              >
                Bridge HYPE
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>

            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-3 border-t border-paper/[0.07] pt-5">
              {FACTS.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
                    {fact.label}
                  </dt>
                  <dd className="tabular mt-1.5 font-mono text-xs text-paper">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="animate-rise space-y-4 [animation-delay:120ms]">
            <ClaimCard />
          </div>
        </div>
      </section>

      {/* Eligibility + steps */}
      <section className="section-shell pb-16 sm:pb-20">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
          <EligibilityPanel />

          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-brand">
              How it works
            </p>
            <h2 className="mt-3 max-w-[18ch] text-3xl font-semibold tracking-[-0.04em] text-paper sm:text-4xl">
              Four steps, once a day.
            </h2>
            <ol className="mt-7 space-y-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-4 rounded-2xl border border-paper/[0.07] bg-ink/35 p-4 transition hover:border-brand/20"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-brand/25 bg-brand/10 font-mono text-[10px] text-brand">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-paper">
                      {step.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-paper-mute">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-paper/[0.07] bg-ink/30 px-4 py-3.5">
              <Fuel className="size-4 shrink-0 text-brand" />
              <p className="text-[10px] leading-5 text-paper-mute">
                Gas is paid in HYPE. Bridge a small balance so your wallet can
                cover the fee.
              </p>
              <a
                href={LINKS.bridge}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-brand transition hover:text-brand-soft"
              >
                Bridge
                <ArrowUpRight className="size-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="section-shell scroll-mt-28 pb-20 sm:pb-24"
        aria-labelledby="claim-faq-heading"
      >
        <div className="grid gap-8 border-t border-paper/[0.07] pt-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-brand">
              Claim FAQ
            </p>
            <h2
              id="claim-faq-heading"
              className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-paper sm:text-3xl"
            >
              Before you claim.
            </h2>
            <p className="mt-3 max-w-sm text-[11px] leading-6 text-paper-mute">
              Everything about the threshold, the cooldown, and the gas the
              claim costs on Elysium.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-paper/[0.07] bg-ink/30 px-4 py-3">
              <MascotAvatarRow size={30} />
              <p className="text-[10px] leading-5 text-paper-mute">
                Claim ELYZ daily, then mint the collection.
              </p>
            </div>
            <Link
              href="/launchpad"
              className="btn-ghost mt-3 h-11 w-full"
            >
              Go to the launchpad
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="border-t border-paper/[0.07]">
            {FAQS.map((item, index) => (
              <details
                key={item.question}
                className="group border-b border-paper/[0.07]"
                open={index === 0}
              >
                <summary className="flex cursor-pointer items-start justify-between gap-6 py-4 text-[13px] font-medium text-paper transition hover:text-brand">
                  <span className="flex gap-3">
                    <span className="mt-0.5 font-mono text-[9px] text-paper-mute">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.question}
                  </span>
                  <span className="accordion-plus mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-paper/[0.08] text-paper-mute transition-transform duration-300 group-hover:border-brand/30 group-hover:text-brand">
                    <svg
                      viewBox="0 0 12 12"
                      className="size-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="M6 2v8M2 6h8" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <div className="pb-4 pl-8 pr-8 text-[11px] leading-6 text-paper-dim">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}