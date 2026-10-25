import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/admin-console";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "NFT collection",
  description:
    "Manage the Elyziuma NFT collection contract, its network, ownership, and the claim faucet.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <AdminConsole />
      </main>
      <SiteFooter />
    </div>
  );
}
