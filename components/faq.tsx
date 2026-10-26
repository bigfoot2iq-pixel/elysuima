import { ArrowUpRight, Plus } from "lucide-react";
import { LINKS } from "@/lib/config";

const FAQS = [
  {
    question: "What is Elyziuma?",
    answer:
      "Elyziuma is a 2,222-piece NFT collection built on Elysium. NFT holders can claim 10,000 ELYZ per NFT, and every wallet can claim 1,000 ELYZ once from the community pool. The claim contract enforces NFT ownership and one-time community claims.",
  },
  {
    question: "How many pieces are in the collection?",
    answer:
      "2,222 unique NFTs. The collection is Phase 1 of a longer roadmap: the first raffle platform on Elysium comes next, then our own token and ways to give back to the people who supported us from the beginning.",
  },
  {
    question: "What is the raffle platform?",
    answer:
      "Phase 2. The goal is to build the first raffle platform on Elysium — a place where the community can participate in raffles and have a real reason to stay involved. Elyziuma holders will have free access to participate in upcoming raffles.",
  },
  {
    question: "What is the launchpad?",
    answer:
      "It is a separate mint page for the Elyziuma NFT collection on Elysium. The owner configures the collection address, mint price, and wallet limit from the admin console. Minting goes directly to the collection, or through OpenSea SeaDrop when the drop uses it.",
  },
  {
    question: "Why the 0.001 balance check?",
    answer:
      "It is a bot-resistance check. Your wallet must hold at least 0.001 native ETH or HYPE on Hyperliquid, HyperEVM, Ethereum, Base, or Ink. The balance stays in your wallet — we only read it.",
  },
  {
    question: "Which chains count?",
    answer:
      "Hyperliquid, HyperEVM, Ethereum mainnet, Base mainnet, and Ink mainnet. The balance must be native ETH or HYPE on one of those chains. A balance on Elysium itself does not count toward the check.",
  },
  {
    question: "Is the balance check enforced on-chain?",
    answer:
      "No. The five-chain threshold runs in the UI and gates the claim buttons. The claim contract does not read balances on other chains, so a direct contract call can bypass the threshold. The contract itself enforces NFT ownership and one-time community claims.",
  },
  {
    question: "How many claims can I make?",
    answer:
      "Each NFT can claim 10,000 ELYZ once. A wallet can claim 1,000 ELYZ from the community pool once. If you hold several NFTs, you can claim them in batches of up to 50 per transaction.",
  },
  {
    question: "Do I need HYPE for gas?",
    answer:
      "Yes. Elysium uses HYPE for gas. NFT holder claims have no protocol fee. The community claim has an admin-set HYPE fee, shown on its card before you submit. If you are starting from zero, bridge HYPE from HyperEVM through ElysPump.",
  },
  {
    question: "I just bridged funds. Why am I still not eligible?",
    answer:
      "Balances are cached for about 30 seconds and read from public RPCs. Wait for the bridge transaction to finalize, then press the recheck button in the eligibility panel.",
  },
  {
    question: "Does 0.001 stop all bots?",
    answer:
      "No. It is a speed bump, not sybil-proof identity. A determined operator can fund many wallets with 0.001 of a native token. The claim contract prevents replay and double claims, but it cannot prove a human is behind every wallet.",
  },
  {
    question: "Is ELYZ worth anything?",
    answer:
      "No. ELYZ is an experimental token with no monetary value, no presale, and no expectation of future value. Elysium is still pre-launch, and the chain may be reset.",
  },
  {
    question: "What happens if a claim pool is empty?",
    answer:
      "The NFT and community pools are capped and funded separately. If a pool cannot cover a claim, that claim reverts; there is no automatic final sweep. The owner can refill the contract with ELYZ, and the admin console shows each pool’s remaining balance.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="section-shell scroll-mt-28 pb-20 sm:pb-28">
      <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em] text-paper sm:text-4xl">
            The fine print,
            <span className="block text-paper-dim">without the fine print.</span>
          </h2>
          <p className="mt-4 max-w-sm text-xs leading-6 text-paper-mute">
            Everything you need to know about the collection, the two claim
            types, the cross-chain check, and the community fee.
          </p>
          <a
            href={LINKS.x}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-dim transition hover:text-brand"
          >
            Ask on X <ArrowUpRight className="size-3" />
          </a>
        </div>

        <div className="border-t border-paper/[0.07]">
          {FAQS.map((item, index) => (
            <details
              key={item.question}
              className="group border-b border-paper/[0.07]"
              open={index === 0}
            >
              <summary className="flex cursor-pointer items-start justify-between gap-6 py-5 text-sm font-medium text-paper transition hover:text-brand">
                <span className="flex gap-3">
                  <span className="mt-0.5 font-mono text-[9px] text-paper-mute">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.question}
                </span>
                <span className="accordion-plus mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-paper/[0.08] text-paper-mute transition-transform duration-300 group-hover:border-brand/30 group-hover:text-brand">
                  <Plus className="size-3" />
                </span>
              </summary>
              <div className="pb-5 pl-8 pr-10 text-[12px] leading-6 text-paper-dim">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
