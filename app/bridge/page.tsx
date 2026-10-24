import type { Metadata } from "next";
import { BridgeContent } from "@/components/bridge/bridge-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Bridge",
  description:
    "Bridge your assets to the Elysium network with ElysPump or Boxa, then explore the ecosystem and join the Elyziuma journey.",
  keywords: [
    "bridge to Elysium",
    "Elysium bridge",
    "ElysPump bridge",
    "Boxa bridge",
    "Elysium 99901",
  ],
  openGraph: {
    title: "Bridge to Elysium",
    description:
      "Move your assets to Elysium through ElysPump or Boxa, then join the Elyziuma journey.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bridge to Elysium",
    description:
      "Move your assets to Elysium through ElysPump or Boxa, then join the Elyziuma journey.",
  },
};

export default function BridgePage() {
  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <BridgeContent />
      </main>
      <SiteFooter />
    </div>
  );
}
