"use client";

import { IS_CONFIGURED } from "@/lib/config";
import { formatAmount } from "@/lib/format";
import { useClaimData } from "./claim-data";
import { ClaimPoolProgress } from "./claim-ui";

/**
 * Global claim progress for both reward pools. Claims are closed, so the public
 * page reports every pool as fully distributed and pins all three bars to 100%.
 * The owner console keeps showing the live on-chain accounting.
 */
export function ClaimPoolsProgress() {
  const { nftPool, communityPool, ownerAllocation, symbol, decimals } =
    useClaimData();

  if (!IS_CONFIGURED) return null;

  const nftClaimed = nftPool;
  const nftRemaining = 0n;
  // The owner allocation is part of the public community allocation, so the
  // community and combined bars both count it as distributed.
  const communityTotal = communityPool + ownerAllocation;
  const communityClaimed = communityTotal;
  const totalClaimed = nftClaimed + communityClaimed;
  const totalPool = nftPool + communityTotal;
  const totalRemaining = nftRemaining;

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
            remaining={nftRemaining}
            symbol={symbol}
            decimals={decimals}
            tone="brand"
          />
        </div>
        <div className="bg-ink/85 px-4 py-3.5 sm:px-5">
          <ClaimPoolProgress
            label="Community pool"
            claimed={communityClaimed}
            total={communityTotal}
            remaining={0n}
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
