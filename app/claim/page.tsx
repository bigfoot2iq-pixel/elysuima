import type { Metadata } from "next";
import { ClaimContent } from "@/components/claim/claim-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CLAIM_CHAIN_ID } from "@/lib/config";

export const metadata: Metadata = {
  title: "Claim Rewards",
  description:
    "Claim 10,000 ELYZ per NFT and 1,000 ELYZ once per wallet on Elysium. NFT claims are free; the community claim needs 0.001 ETH on Ethereum or 0.01 HYPE on HyperEVM mainnet.",
  keywords: [
    "Elyziuma claim",
    "claim ELYZ",
    "Elysium NFT rewards",
    "0.001 ETH / 0.01 HYPE eligibility",
    `Elysium ${CLAIM_CHAIN_ID}`,
  ],
  openGraph: {
    title: "Elyziuma Claim Rewards",
    description:
      "Claim 10,000 ELYZ per NFT for free, and 1,000 ELYZ once per wallet from the community pool. No sign-up, just your wallet.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elyziuma Claim Rewards",
    description:
      "Claim 10,000 ELYZ per NFT for free, and 1,000 ELYZ once per wallet from the community pool. No sign-up, just your wallet.",
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
