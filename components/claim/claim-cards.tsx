"use client";

import { ClaimDataProvider } from "./claim-data";
import { ClaimTokenomics } from "./claim-tokenomics";
import { CommunityClaimCard } from "./community-claim-card";
import { HolderClaimCard } from "./holder-claim-card";

export function ClaimCards() {
  return (
    <ClaimDataProvider>
      <ClaimTokenomics />
      <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <HolderClaimCard />
        <CommunityClaimCard />
      </div>
    </ClaimDataProvider>
  );
}
