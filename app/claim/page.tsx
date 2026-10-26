import type { Metadata } from "next";
import { ClaimContent } from "@/components/claim/claim-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CLAIM_CHAIN_ID } from "@/lib/config";

export const metadata: Metadata = {
  title: "Claim Rewards",
  description:
    "Claim 10,000 ELYZ per NFT and 1,000 ELYZ once per wallet on Elysium. Hold at least 0.001 ETH or HYPE on Hyperliquid, HyperEVM, Ethereum, Base, or Ink to unlock the claim.",
  keywords: [
    "Elyziuma claim",
    "claim ELYZ",
    "Elysium NFT rewards",
    "0.001 ETH or HYPE eligibility",
    `Elysium ${CLAIM_CHAIN_ID}`,
  ],
  openGraph: {
    title: "Elyziuma Claim Rewards",
    description:
      "Claim 10,000 ELYZ per NFT and 1,000 ELYZ once per wallet on Elysium. No sign-up, just your wallet.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elyziuma Claim Rewards",
    description:
      "Claim 10,000 ELYZ per NFT and 1,000 ELYZ once per wallet on Elysium. No sign-up, just your wallet.",
  },
};

export default function ClaimPage() {
  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <ClaimContent />
      </main>
      <SiteFooter />
    </div>
  );
}
