import { ShieldCheck } from "lucide-react";
import { getPerWalletLimit } from "@/lib/launchpad/drop";
import type {
  ContractInspection,
  PublicLaunchpadConfig,
} from "@/lib/launchpad/types";

export function LaunchpadFaq({
  config,
  inspection,
}: {
  config: PublicLaunchpadConfig;
  inspection?: ContractInspection;
}) {
  const limit = getPerWalletLimit(config, inspection);
  const drop = inspection?.elyziumaDrop;

  const faqs = [
    {
      question: "How do I mint?",
      answer:
        "Connect a wallet, make sure it is on Elysium, choose how many NFTs you want, and confirm the transaction. The mint panel reads the collection and calls the public mint function it detects. If the collection uses OpenSea SeaDrop, it calls mintPublic on SeaDrop with the correct fee recipient.",
    },
    {
      question: "Which network and currency do I need?",
      answer:
        "Elysium mainnet, chain ID 99901. Gas and any mint price are paid in HYPE, the native currency of Elysium. The mint panel offers to switch your wallet automatically.",
    },
    {
      question: "What is the maximum per wallet?",
      answer: `The current limit is ${limit} per wallet. ${
        drop
          ? "It comes from the collection contract, so it always matches the on-chain rule."
          : "It is the lower of the launchpad setting and the on-chain SeaDrop limit when a SeaDrop drop is detected."
      } The contract remains the final authority.`,
    },
    {
      question: "Why did my transaction fail?",
      answer:
        "Common causes are a closed or sold-out drop, a wallet that already reached its limit, insufficient HYPE for the price plus gas, or an RPC that does not accept write transactions. Elysium is pre-launch, so the community RPC is read-only in some deployments.",
    },
    {
      question: "Where can I see my NFT after minting?",
      answer:
        "The mint panel links to the transaction on ElysScan. Your wallet should also show the NFT once the collection metadata is indexed. ElysScan is the source of truth.",
    },
    {
      question: "Are mints refundable?",
      answer:
        "No. Blockchain transactions are irreversible. Minting sends real HYPE for the price and gas. Verify the collection address on ElysScan before confirming.",
    },
    {
      question: "Is Elyziuma affiliated with OpenSea or Elysium?",
      answer:
        "No. Elyziuma is an independent interface. OpenSea SeaDrop is a public mint standard, and Elysium is the network. Always verify the collection contract before signing.",
    },
  ];

  return (
    <section
      id="launchpad-faq"
      className="section-shell scroll-mt-28 pb-20 pt-6 sm:pb-24"
      aria-labelledby="launchpad-faq-heading"
    >
      <div className="glass rounded-2xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="launchpad-faq-heading"
            className="text-sm font-semibold text-paper"
          >
            Before you sign
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/20 bg-mint/[0.05] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-mint">
            <ShieldCheck className="size-3" />
            {inspection?.ok ? "Contract verified" : "Awaiting contract"}
          </span>
        </div>

        <div className="mt-1 border-t border-paper/[0.07]">
          {faqs.map((item) => (
            <details key={item.question} className="group border-b border-paper/[0.07]">
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-3 text-[13px] font-medium text-paper transition hover:text-brand">
                {item.question}
                <span className="accordion-plus flex size-5 shrink-0 items-center justify-center rounded-full border border-paper/[0.08] font-mono text-[11px] leading-none text-paper-mute transition-transform duration-300 group-hover:border-brand/30 group-hover:text-brand">
                  +
                </span>
              </summary>
              <p className="pb-3 text-[11px] leading-6 text-paper-dim">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}