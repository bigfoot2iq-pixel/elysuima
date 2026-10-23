import { ArrowUpRight, Plus } from "lucide-react";
import { LINKS } from "@/lib/config";

const FAQS = [
  {
    question: "What is Elyziuma?",
    answer:
      "Elyziuma is a daily claim experiment on Elysium Testnet. Each wallet can claim 100 ELYZ once every 24 hours. The owner sets the amount; the contract enforces the cooldown.",
  },
  {
    question: "Why do I need 0.001 ETH?",
    answer:
      "It is a bot-resistance check. Your wallet must hold at least 0.001 native ETH on Ethereum, Abstract, Base, or Ink. The ETH stays in your wallet — we only read the balance.",
  },
  {
    question: "Which chains count?",
    answer:
      "Ethereum mainnet, Abstract mainnet, Base mainnet, and Ink mainnet. The balance must be native ETH on one of those chains. A balance on Elysium itself does not count toward the check.",
  },
  {
    question: "Is the balance check enforced on-chain?",
    answer:
      "The Elysium contract cannot read balances on other chains. Instead, our server verifies the four balances and signs a short-lived EIP-712 authorization bound to your wallet. The contract verifies that signature, the amount, a one-time nonce, and the 24-hour cooldown. Without a valid signature, a direct contract call reverts.",
  },
  {
    question: "How often can I claim?",
    answer:
      "Once every 24 hours per wallet. The countdown starts when your claim transaction is confirmed. The timer in the claim card reads your last claim directly from the contract.",
  },
  {
    question: "Do I need HYPE for gas?",
    answer:
      "Yes. Elysium uses HYPE for gas. The claim itself is a normal transaction, so you need a small amount of testnet HYPE. Use the official Elysium faucet if you are starting from zero.",
  },
  {
    question: "I just bridged ETH. Why am I still not eligible?",
    answer:
      "Balances are cached for about 30 seconds and read from public RPCs. Wait for the bridge transaction to finalize, then press the recheck button in the eligibility panel.",
  },
  {
    question: "Does 0.001 ETH stop all bots?",
    answer:
      "No. It is a speed bump, not sybil-proof identity. A determined operator can fund many wallets with 0.001 ETH. The signature gate, nonce, and 24-hour cooldown prevent replay and double claims, but they cannot prove a human is behind every wallet.",
  },
  {
    question: "Is ELYZ worth anything?",
    answer:
      "No. ELYZ is a testnet token with no monetary value, no presale, and no expectation of future value. This is an experimental claim page on Elysium Testnet.",
  },
  {
    question: "What happens if the faucet is empty?",
    answer:
      "When the pool can no longer cover a full daily amount, the next claim sweeps whatever remains — a Shaniu-style final claim. After that, claims pause until the owner refills the faucet.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="section-shell scroll-mt-28 pb-20 sm:pb-28">
      <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[9px] uppercase tracking-[0.22em] text-brand">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-paper sm:text-4xl">
            The fine print,
            <span className="block text-paper-dim">without the fine print.</span>
          </h2>
          <p className="mt-4 max-w-sm text-xs leading-6 text-paper-mute">
            Everything you need to know about the daily claim, the cross-chain
            check, and the trust model behind the signature.
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
