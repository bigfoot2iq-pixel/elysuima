"use client";

import { useReadContracts } from "wagmi";
import { claimAbi, tokenAbi } from "@/lib/abis";
import {
  CLAIM_ADDRESS,
  IS_CONFIGURED,
  TOKEN_ADDRESS,
  TOKEN_FALLBACK,
} from "@/lib/config";
import { formatCompact } from "@/lib/format";

export function StatsStrip() {
  const { data } = useReadContracts({
    contracts: [
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "totalClaimed",
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "nftClaimedTotal",
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "communityClaimedTotal",
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "nftPoolRemaining",
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "communityPoolRemaining",
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "decimals",
      },
    ],
    query: {
      enabled: IS_CONFIGURED,
      refetchInterval: 20_000,
    },
    allowFailure: true,
  });

  const [
    totalClaimedResult,
    nftClaimedResult,
    communityClaimedResult,
    nftPoolResult,
    communityPoolResult,
    decimalsResult,
  ] = data ?? [];

  const totalClaimed =
    totalClaimedResult?.status === "success"
      ? (totalClaimedResult.result as bigint)
      : undefined;
  const nftClaimed =
    nftClaimedResult?.status === "success"
      ? (nftClaimedResult.result as bigint)
      : undefined;
  const communityClaimed =
    communityClaimedResult?.status === "success"
      ? (communityClaimedResult.result as bigint)
      : undefined;
  const nftPool =
    nftPoolResult?.status === "success"
      ? (nftPoolResult.result as bigint)
      : undefined;
  const communityPool =
    communityPoolResult?.status === "success"
      ? (communityPoolResult.result as bigint)
      : undefined;
  const decimals =
    decimalsResult?.status === "success"
      ? Number(decimalsResult.result)
      : TOKEN_FALLBACK.decimals;

  const stats = [
    {
      label: "Total claimed",
      value: formatCompact(totalClaimed, decimals),
      suffix: TOKEN_FALLBACK.symbol,
    },
    {
      label: "NFT claimed",
      value: formatCompact(nftClaimed, decimals),
      suffix: TOKEN_FALLBACK.symbol,
    },
    {
      label: "Community claimed",
      value: formatCompact(communityClaimed, decimals),
      suffix: TOKEN_FALLBACK.symbol,
    },
    {
      label: "NFT pool left",
      value: formatCompact(nftPool, decimals),
      suffix: TOKEN_FALLBACK.symbol,
    },
    {
      label: "Community pool left",
      value: formatCompact(communityPool, decimals),
      suffix: TOKEN_FALLBACK.symbol,
    },
  ];

  return (
    <section className="section-shell pb-14 sm:pb-20" aria-label="Claim stats">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-paper/[0.08] bg-paper/[0.07] sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-ink/85 p-4 sm:p-5">
            <p className="text-[9px] uppercase tracking-[0.18em] text-paper-mute">
              {stat.label}
            </p>
            <p className="tabular mt-2 font-mono text-xl font-medium tracking-[-0.04em] text-paper sm:text-2xl">
              {stat.value}
              <span className="ml-1.5 text-[9px] font-normal uppercase tracking-[0.12em] text-paper-mute">
                {stat.suffix}
              </span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
