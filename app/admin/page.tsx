import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Owner console",
  description:
    "Manage the Elyziuma daily claim: update the amount, pause claims, fund the faucet, and rotate the signer.",
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
        <AdminDashboard />
      </main>
      <SiteFooter />
    </div>
  );
}
