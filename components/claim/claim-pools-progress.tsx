"use client";

import { IS_CONFIGURED } from "@/lib/config";
import { formatAmount } from "@/lib/format";
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
    ownerAllocation,
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
  // The owner allocation is part of the public community allocation. Count it
  // as active from the start so this bar matches the 12,110,000 Community cell.
  const communityClaimed =
    communityPoolRemaining === undefined ||
    communityPool <= communityPoolRemaining
      ? 0n
      : communityPool - communityPoolRemaining;
  const communityActive = ownerAllocation + communityClaimed;
  const communityTotal = communityPool + ownerAllocation;

  // Both pools combined. The owner allocation counts as active from the start,
  // so the total begins at 1,000,000 of 34,330,000 like the community bar.
  const totalClaimed =
    nftClaimed === undefined ? undefined : nftClaimed + communityActive;
  const totalPool = nftPool + communityTotal;
  const totalRemaining =
    nftPoolRemaining === undefined || communityPoolRemaining === undefined
      ? undefined
      : nftPoolRemaining + communityPoolRemaining;

  return (
    <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-paper/[0.08] bg-paper/[0.07]">
      <div className="bg-ink/85 px-4 py-3.5 sm:px-5">
        <ClaimPoolProgress
          label="All pools"
          claimed={totalClaimed}
          total={totalPool}
          remaining={totalRemaining}
          symbol={symbol}
          decimals={decimals}
          tone="mixed"
          totalText={formatAmount(totalPool, decimals, 0)}
        />
      </div>
      <div className="grid gap-px sm:grid-cols-2">
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
            claimed={communityActive}
            total={communityTotal}
            remaining={communityPoolRemaining}
            symbol={symbol}
            decimals={decimals}
            tone="mint"
            claimedLabel="active"
            totalText={formatAmount(communityTotal, decimals, 0)}
          />
        </div>
      </div>
    </div>
  );
}
