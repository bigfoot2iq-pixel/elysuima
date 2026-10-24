import type { Metadata } from "next";
import { LaunchpadContent } from "@/components/launchpad/launchpad-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Launchpad",
  description:
    "Mint the Elyziuma NFT collection on Elysium. Connect a wallet, choose a quantity, and mint directly on-chain or through OpenSea SeaDrop.",
  keywords: [
    "Elyziuma launchpad",
    "Elysium NFT",
    "mint NFT",
    "SeaDrop",
    "Elysium 99901",
  ],
  openGraph: {
    title: "Elyziuma Launchpad",
    description:
      "Mint the Elyziuma collection on Elysium. Direct contract minting with automatic SeaDrop support.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elyziuma Launchpad",
    description:
      "Mint the Elyziuma collection on Elysium. Direct contract minting with automatic SeaDrop support.",
  },
};

export default function LaunchpadPage() {
  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <LaunchpadContent />
      </main>
      <SiteFooter />
    </div>
  );
}
