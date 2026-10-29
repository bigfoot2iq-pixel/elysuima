"use client";

import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClaimData } from "./claim-data";

/**
 * Fixed token allocation shown above the claim cards. Values are read from the
 * deployed contracts so a redeploy with different pool sizes stays accurate.
 */
export function ClaimTokenomics() {
  const {
    totalSupply,
    nftPool,
    communityPool,
    ownerAllocation,
    symbol,
    decimals,
  } = useClaimData();

  const items = [
    {
      label: "Total supply",
      value: totalSupply,
      hint: "fixed at deployment",
      className: "",
    },
    {
      label: "NFT holders",
      value: nftPool,
      hint: "2,222 NFTs × 10,000",
      className: "",
    },
    {
      label: "Community",
      value: communityPool + ownerAllocation,
      hint: "11,110 wallets × 1,000 + 1,000,000",
      className: "col-span-2 sm:col-span-1",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-paper/[0.08] bg-paper/[0.07] sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn("bg-ink/85 px-4 py-3.5 sm:px-5", item.className)}
        >
          <dt className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
            {item.label}
          </dt>
          <dd className="mt-1.5 flex items-baseline gap-1.5">
            <span className="tabular truncate font-mono text-lg font-medium tracking-[-0.04em] text-paper">
              {formatAmount(item.value, decimals, 0)}
            </span>
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-paper-mute">
              {symbol}
            </span>
          </dd>
          <p className="mt-1 text-[9px] leading-4 text-paper-mute">
            {item.hint}
          </p>
        </div>
      ))}
    </dl>
  );
}
