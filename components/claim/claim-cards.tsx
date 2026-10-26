"use client";

import { ClaimDataProvider } from "./claim-data";
import { ClaimStatusBar } from "./claim-status-bar";
import { CommunityClaimCard } from "./community-claim-card";
import { HolderClaimCard } from "./holder-claim-card";

export function ClaimCards() {
  return (
    <ClaimDataProvider>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <HolderClaimCard />
        <CommunityClaimCard />
      </div>
      <ClaimStatusBar />
    </ClaimDataProvider>
  );
}
