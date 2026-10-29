import Image from "next/image";
import { ArrowUpRight, Fuel } from "lucide-react";
import { ClaimCards } from "@/components/claim/claim-cards";
import { LINKS } from "@/lib/config";

const FAQS = [
  {
    question: "How much can I claim?",
    answer:
      "Each Elyziuma NFT pays 10,000 ELYZ once, and every wallet can claim 1,000 ELYZ once from the community pool. The two rewards are independent: NFT holders can also claim the community reward, and a wallet that already claimed 1,000 ELYZ can still claim any unclaimed NFT it later receives.",
  },
  {
    question: "Why does the community claim need a balance check?",
    answer:
      "The 1,000 ELYZ community claim requires 0.001 ETH on Ethereum or 0.01 HYPE on HyperEVM. These are mainnet balances. NFT holder claims are free and skip this check. It is a UI anti-sybil gate; the claim contract does not read balances on other chains.",
  },
  {
    question: "What happens when an NFT is transferred?",
    answer:
      "The reward belongs to the NFT id, not the wallet. If it has not claimed yet, the new owner can claim it. Once claimed, it stays consumed forever and cannot be claimed again after any transfer.",
  },
  {
    question: "What fees do I pay?",
    answer:
      "Gas is paid in HYPE. NFT holder claims have no protocol fee. The community claim has an owner-set HYPE fee shown on its card, plus gas.",
  },
  {
    question: "What is the ELYZ supply?",
    answer:
      "34,330,000 ELYZ: 22,220,000 reserved for 2,222 NFT holders and 12,110,000 for the community, including 1,000,000 allocated at deployment.",
  },
  {
    question: "Is the claim custodial?",
    answer:
      "No. The claim contract transfers tokens directly to your wallet. Elyziuma never takes custody of your funds.",
  },
];

export function ClaimContent() {
  return (
    <>
      <section className="relative overflow-hidden">
        {/* Same quiet atmosphere as the home hero: one soft light source and a
            cool wash opposite it. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="animate-breathe absolute left-1/2 top-[6%] size-[420px] -translate-x-1/2 rounded-full bg-brand/[0.16] blur-[110px]" />
          <div className="absolute -left-32 top-1/3 size-[380px] rounded-full bg-beak/[0.09] blur-[120px]" />
        </div>

        <div className="section-shell relative pb-14 pt-12 sm:pb-16 sm:pt-16">
          <div className="animate-rise mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-12">
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start">
                <span className="eyebrow">Claim rewards</span>
              </div>
              <h1 className="mt-4 font-display text-[clamp(2.3rem,5.4vw,3.9rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-paper">
                Your <span className="text-gradient">ELYZ</span>, two ways.
              </h1>
              <p className="mx-auto mt-4 max-w-lg text-[15px] leading-7 text-paper-dim lg:mx-0">
                NFT holders claim{" "}
                <span className="font-mono text-paper">
                  10,000 ELYZ per NFT
                </span>{" "}
                for free. Every wallet can claim{" "}
                <span className="font-mono text-paper">1,000 ELYZ once</span>{" "}
                from the community pool for an owner-set HYPE fee. The two
                claims are independent.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[360px] lg:max-w-none">
              <div
                className="pointer-events-none absolute -inset-5 rounded-full bg-brand/[0.14] blur-[70px]"
                aria-hidden="true"
              />
              <div className="glass relative overflow-hidden rounded-[32px] border border-paper/[0.08] p-2">
                <Image
                  src="/brand/elyziuma-token.png"
                  alt="Elyziuma token mascot holding a flaming pan"
                  width={1024}
                  height={768}
                  priority
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 360px, 300px"
                  className="h-auto w-full rounded-[24px]"
                />
                <span className="absolute bottom-5 right-5 rounded-full border border-paper/10 bg-ink/80 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-brand backdrop-blur">
                  ELYZ
                </span>
              </div>
            </div>
          </div>

          <div className="animate-rise mt-9 [animation-delay:120ms]">
            <ClaimCards />
          </div>
        </div>
      </section>

      <section className="section-shell pb-10 sm:pb-12">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] text-paper-mute">
            <Fuel className="size-3.5 text-brand" />
            <span>
              Gas is paid in HYPE. NFT claims are free; the community fee is
              shown above.
            </span>
            <a
              href={LINKS.bridge}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand transition hover:text-brand-soft"
            >
              Bridge HYPE
              <ArrowUpRight className="size-3" />
            </a>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="section-shell scroll-mt-28 pb-16 sm:pb-20"
        aria-labelledby="claim-faq-heading"
      >
        <div className="mx-auto max-w-2xl border-t border-paper/[0.07] pt-8 sm:pt-10">
          <p className="text-[9px] uppercase tracking-[0.22em] text-brand">
            FAQ
          </p>
          <h2
            id="claim-faq-heading"
            className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-paper"
          >
            Before you claim.
          </h2>

          <div className="mt-5">
            {FAQS.map((item) => (
              <details
                key={item.question}
                className="group border-b border-paper/[0.07]"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-6 py-3.5 text-[13px] font-medium text-paper transition hover:text-brand">
                  {item.question}
                  <span className="accordion-plus flex size-6 shrink-0 items-center justify-center rounded-full border border-paper/[0.08] text-paper-mute transition-transform duration-300 group-hover:border-brand/30 group-hover:text-brand">
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
                <div className="pb-4 pr-8 text-[11px] leading-6 text-paper-dim">
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
