import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LINKS } from "@/lib/config";
import { ClaimCard } from "./claim-card";
import { EligibilityPanel } from "./eligibility-panel";

const FACTS = [
  { label: "Daily drop", value: "100 ELYZ" },
  { label: "Cooldown", value: "24 hours" },
  { label: "Network", value: "Elysium" },
];

export function Hero() {
  return (
    <section id="claim" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="orb animate-float absolute -right-16 top-24 hidden size-[420px] bg-brand/10 blur-[90px] lg:block" />
        <div className="orb animate-float-slow absolute -left-24 top-1/2 size-[320px] bg-brand-deep/15 blur-[100px]" />
        <div className="absolute right-[8%] top-20 hidden size-[460px] rounded-full border border-brand/[0.09] lg:block">
          <div className="absolute inset-10 rounded-full border border-brand/[0.07]" />
          <div className="absolute inset-24 rounded-full border border-brand/[0.05]" />
          <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_18px_rgba(52,183,221,0.9)]" />
        </div>
      </div>

      <div className="section-shell relative grid gap-12 pb-20 pt-12 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-20">
        <div className="animate-rise">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/[0.06] px-3 py-1.5">
            <span className="live-dot" />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-brand">
              Elysium Testnet · Live
            </span>
          </div>

          <h1 className="mt-6 max-w-[13ch] text-[clamp(3.2rem,7.2vw,6.1rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-paper">
            Your daily <span className="text-gradient">ELYZ</span>,
            <span className="block">on Elysium.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-7 text-paper-dim sm:text-base">
            A daily drop for the Elysium community. Hold at least{" "}
            <span className="font-mono text-paper">0.001 ETH</span> on
            Ethereum, Abstract, Base, or Ink — then claim{" "}
            <span className="font-mono text-paper">100 ELYZ</span> every 24
            hours.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {[
              { icon: ShieldCheck, label: "0.001 ETH threshold" },
              { icon: Sparkles, label: "4 chains accepted" },
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
            <a href="#how-it-works" className="btn-primary px-6">
              How it works
              <ArrowDownRight className="size-4" />
            </a>
            <a
              href={LINKS.faucet}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-5"
            >
              Get testnet HYPE
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-paper/[0.07] pt-5">
            {FACTS.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
                  {fact.label}
                </dt>
                <dd className="mt-1.5 font-mono text-xs text-paper">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="animate-rise space-y-4 [animation-delay:120ms]">
          <ClaimCard />
          <EligibilityPanel />
        </div>
      </div>

      <div className="section-shell relative pb-8">
        <div className="flex items-center justify-between gap-4 border-t border-paper/[0.06] pt-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper-mute">
            ELYZ · daily · Elysium testnet
          </p>
          <p className="hidden text-[10px] text-paper-mute sm:block">
            No sign-ups. Just your wallet.
          </p>
        </div>
      </div>
    </section>
  );
}
