import type { Metadata } from "next";
import { AdminCollection } from "@/components/admin-collection";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Collection console",
  description:
    "Manage the Elyziuma NFT collection: open or close the public mint, set the price and base URI, owner mint, withdraw, and transfer ownership.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CollectionAdminPage() {
  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <AdminCollection />
      </main>
      <SiteFooter />
    </div>
  );
}
