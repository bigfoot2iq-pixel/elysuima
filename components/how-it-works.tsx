import {
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { LINKS } from "@/lib/config";
import { getDefaultChainId, getElysiumChain } from "@/lib/chains";

const chain = getElysiumChain(getDefaultChainId());

const STEPS = [
  {
    number: "01",
    icon: Wallet,
    title: "Connect on Elysium",
    body: `Switch your wallet to ${chain.name} (chain ${chain.id}). Need gas? Bridge HYPE from HyperEVM through ElysPump.`,
    href: LINKS.bridge,
    linkLabel: "Bridge HYPE",
  },
  {
    number: "02",
    icon: ShieldCheck,
    title: "Check the community gate",
    body: "The community claim requires 0.001 ETH on Ethereum, Base, or Ink, or 0.05 HYPE on Hyperliquid or HyperEVM. NFT holder claims are free and skip this check.",
    href: "/#faq",
    linkLabel: "See the check",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Claim your rewards",
    body: "NFT holders claim 10,000 ELYZ per NFT. Every wallet can claim 1,000 ELYZ once from the community pool. The contract enforces NFT ownership and one-time community claims.",
    href: "/#faq",
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
          <p className="eyebrow">Claim rewards</p>
          <h2 className="mt-4 max-w-xl font-display text-3xl font-extrabold tracking-[-0.04em] text-paper sm:text-4xl">
            Three steps. Two ways to claim.
          </h2>
        </div>
        <p className="max-w-sm text-xs leading-6 text-paper-mute">
          No account, no email, no custody. The community balance check runs
          across five mainnet chains in the UI; the claim contract enforces NFT
          ownership and one-time community claims.
        </p>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {STEPS.map((step) => (
          <article
            key={step.number}
            className="group ink-panel relative overflow-hidden rounded-3xl p-5 transition hover:border-brand/35 sm:p-6"
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
