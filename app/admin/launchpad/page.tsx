import type { Metadata } from "next";
import { AdminLaunchpad } from "@/components/admin-launchpad";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Launchpad settings",
  description:
    "Configure the Elyziuma launchpad: collection contract, Elysium RPC, mint method, price, and per-wallet limits.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LaunchpadAdminPage() {
  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <AdminLaunchpad />
      </main>
      <SiteFooter />
    </div>
  );
}
