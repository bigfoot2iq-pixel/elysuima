import type { Metadata } from "next";
import { ClaimGate } from "@/components/claim/claim-gate";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Daily Claim",
  description:
    "Claim 100 ELYZ every 24 hours on Elysium. Hold at least 0.001 ETH or HYPE on Hyperliquid, HyperEVM, Ethereum, Base, or Ink to unlock the daily claim.",
  keywords: [
    "Elyziuma daily claim",
    "claim ELYZ",
    "Elysium claim",
    "0.001 ETH or HYPE eligibility",
    "Elysium 99901",
  ],
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Elyziuma Daily Claim",
    description:
      "Claim 100 ELYZ every 24 hours on Elysium. No sign-up, just your wallet.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elyziuma Daily Claim",
    description:
      "Claim 100 ELYZ every 24 hours on Elysium. No sign-up, just your wallet.",
  },
};

export default function ClaimPage() {
  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <ClaimGate />
      </main>
      <SiteFooter />
    </div>
  );
}
