import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminAccessGate } from "@/components/admin/admin-access-gate";
import { AdminConsole } from "@/components/admin/admin-console";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  getAdminOwnerAddress,
  readAdminSession,
} from "@/lib/server/admin-session";

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
        <Suspense fallback={<AdminAccessFallback />}>
          <AdminAccess />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * The session cookie is read on the server, so the console never renders for
 * anyone but the collection owner, even before client JavaScript runs.
 */
async function AdminAccess() {
  await connection();

  const session = await readAdminSession();

  if (!session) {
    return <AdminAccessGate ownerAddress={getAdminOwnerAddress()} />;
  }

  return <AdminConsole sessionAddress={session.address} />;
}

function AdminAccessFallback() {
  return (
    <div className="section-shell pb-24 pt-14" aria-busy="true">
      <div className="h-[430px] animate-pulse rounded-[32px] bg-paper/[0.04]" />
      <p className="sr-only">Checking owner access…</p>
    </div>
  );
}
