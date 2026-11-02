"use client";

import { LockKeyhole } from "lucide-react";
import { ClaimDataProvider, useClaimData } from "./claim-data";
import { ClaimPoolsProgress } from "./claim-pools-progress";
import { ClaimTokenomics } from "./claim-tokenomics";
import { CommunityClaimCard } from "./community-claim-card";
import { HolderClaimCard } from "./holder-claim-card";

function ClaimClosedNotice() {
  const { paused } = useClaimData();

  if (!paused) return null;

  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/[0.06] px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
        <LockKeyhole className="size-4" />
      </span>
      <div>
        <p className="text-[13px] font-semibold text-paper">Claims are closed</p>
        <p className="mt-0.5 text-[10px] leading-4 text-paper-mute">
          The claim contract is paused. Holder and community claims are no longer
          available; rewards already claimed stay in your wallet.
        </p>
      </div>
    </div>
  );
}

export function ClaimCards() {
  return (
    <ClaimDataProvider>
      <ClaimTokenomics />
      <ClaimClosedNotice />
      <ClaimPoolsProgress />
      <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <HolderClaimCard />
        <CommunityClaimCard />
      </div>
    </ClaimDataProvider>
  );
}
