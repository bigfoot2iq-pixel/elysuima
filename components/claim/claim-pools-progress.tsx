"use client";

import { IS_CONFIGURED } from "@/lib/config";
import { useClaimData } from "./claim-data";
import { ClaimPoolProgress } from "./claim-ui";

/**
 * Global claim progress for both reward pools. This reads the deployed pool
 * sizes and the live remaining balances, so it stays visible before a wallet
 * connects or runs any eligibility check.
 */
export function ClaimPoolsProgress() {
  const {
    nftPool,
    communityPool,
    nftPoolRemaining,
    communityPoolRemaining,
    symbol,
    decimals,
  } = useClaimData();

  if (!IS_CONFIGURED) return null;

  const nftClaimed =
    nftPoolRemaining === undefined
      ? undefined
      : nftPool > nftPoolRemaining
        ? nftPool - nftPoolRemaining
        : 0n;
  const communityClaimed =
    communityPoolRemaining === undefined
      ? undefined
      : communityPool > communityPoolRemaining
        ? communityPool - communityPoolRemaining
        : 0n;

  return (
    <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-paper/[0.08] bg-paper/[0.07] sm:grid-cols-2">
      <div className="bg-ink/85 px-4 py-3.5 sm:px-5">
        <ClaimPoolProgress
          label="Holder pool"
          claimed={nftClaimed}
          total={nftPool}
          remaining={nftPoolRemaining}
          symbol={symbol}
          decimals={decimals}
          tone="brand"
        />
      </div>
      <div className="bg-ink/85 px-4 py-3.5 sm:px-5">
        <ClaimPoolProgress
          label="Community pool"
          claimed={communityClaimed}
          total={communityPool}
          remaining={communityPoolRemaining}
          symbol={symbol}
          decimals={decimals}
          tone="mint"
        />
      </div>
    </div>
  );
}
