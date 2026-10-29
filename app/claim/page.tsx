import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminAccessGate } from "@/components/admin/admin-access-gate";
import { ClaimContent } from "@/components/claim/claim-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CLAIM_CHAIN_ID } from "@/lib/config";
import {
  getAdminOwnerAddress,
  readClaimSession,
} from "@/lib/server/admin-session";
import { getClaimAccessAddresses } from "@/lib/server/claim-access";

export const metadata: Metadata = {
  title: "Claim Rewards",
  description:
    "Claim 10,000 ELYZ per NFT and 1,000 ELYZ once per wallet on Elysium. NFT claims are free; the community claim needs 0.001 ETH on Ethereum, 0.01 HYPE on Hyperliquid, or 0.01 HYPE on HyperEVM mainnet.",
  keywords: [
    "Elyziuma claim",
    "claim ELYZ",
    "Elysium NFT rewards",
    "0.001 ETH / 0.01 HYPE eligibility",
    `Elysium ${CLAIM_CHAIN_ID}`,
  ],
  // The claim page is private for allowlisted wallets until claims go public.
  robots: {
    index: false,
    follow: false,
  },
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
        <Suspense fallback={<ClaimAccessFallback />}>
          <ClaimAccess />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * The session is read on the server, so the claim flow never renders for
 * anyone outside the allowlist, even before client JavaScript runs.
 */
async function ClaimAccess() {
  await connection();

  const owner = getAdminOwnerAddress();
  const session = await readClaimSession();

  if (!session) {
    return (
      <AdminAccessGate
        ownerAddress={owner}
        allowedAddresses={getClaimAccessAddresses(owner)}
        context="claim"
      />
    );
  }

  return <ClaimContent />;
}

function ClaimAccessFallback() {
  return (
    <div className="section-shell pb-24 pt-14" aria-busy="true">
      <div className="h-[430px] animate-pulse rounded-[32px] bg-paper/[0.04]" />
      <p className="sr-only">Checking wallet access…</p>
    </div>
  );
}
