import type { Metadata } from "next";
import { FaucetContent } from "@/components/faucet/faucet-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Faucet",
  description:
    "Get free testnet HYPE on Elysium to cover gas. Open the official faucet, connect your wallet, and start claiming and minting on chain 99801.",
  keywords: [
    "Elysium faucet",
    "Elysium testnet faucet",
    "testnet HYPE",
    "free HYPE",
    "Elysium 99801",
  ],
  openGraph: {
    title: "Elysium Faucet",
    description:
      "Get free testnet HYPE for gas on Elysium, then claim ELYZ and mint the collection.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elysium Faucet",
    description:
      "Get free testnet HYPE for gas on Elysium, then claim ELYZ and mint the collection.",
  },
};

export default function FaucetPage() {
  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <FaucetContent />
      </main>
      <SiteFooter />
    </div>
  );
}
