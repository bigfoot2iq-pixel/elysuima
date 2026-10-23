import {
  ArrowUpRight,
  ShieldCheck,
  Timer,
  Wallet,
} from "lucide-react";
import { LINKS } from "@/lib/config";

const STEPS = [
  {
    number: "01",
    icon: Wallet,
    title: "Connect on Elysium",
    body: "Switch your wallet to Elysium Testnet. New here? Grab a little HYPE from the official faucet for gas.",
    href: LINKS.faucet,
    linkLabel: "Elysium faucet",
  },
  {
    number: "02",
    icon: ShieldCheck,
    title: "Verify your wallet",
    body: "We read your native ETH balance on Ethereum, Abstract, Base, and Ink. Holding 0.001 ETH on any one chain is enough.",
    href: "#eligibility",
    linkLabel: "See the check",
  },
  {
    number: "03",
    icon: Timer,
    title: "Claim every 24 hours",
    body: "The faucet contract enforces a per-wallet cooldown. A short-lived signature authorizes each claim and cannot be replayed.",
    href: "#faq",
    linkLabel: "Read the rules",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="section-shell scroll-mt-28 pb-16 sm:pb-24"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[9px] uppercase tracking-[0.22em] text-brand">
            How it works
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-paper sm:text-4xl">
            Three steps. One claim a day.
          </h2>
        </div>
        <p className="max-w-sm text-xs leading-6 text-paper-mute">
          No account, no email, no custody. Eligibility is checked across four
          chains and enforced by the claim contract.
        </p>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {STEPS.map((step) => (
          <article
            key={step.number}
            className="group glass-soft relative overflow-hidden rounded-3xl p-5 transition hover:border-brand/20 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[0.18em] text-brand">
                {step.number}
              </span>
              <span className="flex size-9 items-center justify-center rounded-full border border-paper/[0.08] bg-paper/[0.03] text-brand transition group-hover:border-brand/30 group-hover:bg-brand/10">
                <step.icon className="size-4" />
              </span>
            </div>
            <h3 className="mt-6 text-base font-semibold tracking-[-0.02em] text-paper">
              {step.title}
            </h3>
            <p className="mt-2 text-[12px] leading-6 text-paper-dim">
              {step.body}
            </p>
            <a
              href={step.href}
              target={step.href.startsWith("http") ? "_blank" : undefined}
              rel={step.href.startsWith("http") ? "noreferrer" : undefined}
              className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper-mute transition hover:text-brand"
            >
              {step.linkLabel}
              <ArrowUpRight className="size-3" />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
