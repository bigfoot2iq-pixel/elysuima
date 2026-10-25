"use client";

import { useEffect, useState } from "react";
import {
  usePublicClient,
  useReadContract,
  useWatchContractEvent,
} from "wagmi";
import { ArrowUpRight, Radio } from "lucide-react";
import type { Address, Hash } from "viem";
import { claimAbi, claimedEvent, tokenAbi } from "@/lib/abis";
import {
  CLAIM_ADDRESS,
  CLAIM_CHAIN_ID,
  IS_CONFIGURED,
  TOKEN_ADDRESS,
  explorerTx,
} from "@/lib/config";
import { formatAmount, formatRelative, shortAddress } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { TokenMark } from "./token-mark";

type ClaimItem = {
  wallet: Address;
  amount: bigint;
  timestamp: number;
  txHash: Hash;
};

const MAX_ITEMS = 8;
const LOOKBACK_BLOCKS = 20_000n;

export function ClaimsFeed() {
  const publicClient = usePublicClient({ chainId: CLAIM_CHAIN_ID });
  const now = useNow(30_000);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const { data: decimalsData } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: "decimals",
    query: { enabled: IS_CONFIGURED },
  });

  const decimals = decimalsData ?? 18;
  const isLoading = loading && Boolean(publicClient) && IS_CONFIGURED;

  useEffect(() => {
    if (!publicClient || !IS_CONFIGURED) return;

    let cancelled = false;

    (async () => {
      try {
        const latest = await publicClient.getBlockNumber();
        const fromBlock = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
        const logs = await publicClient.getLogs({
          address: CLAIM_ADDRESS,
          event: claimedEvent,
          fromBlock,
          toBlock: latest,
        });

        if (cancelled) return;

        const items = logs
          .map((log) => {
            const { wallet, amount, timestamp } = log.args;
            if (
              !wallet ||
              amount === undefined ||
              timestamp === undefined ||
              !log.transactionHash
            ) {
              return null;
            }
            return {
              wallet,
              amount,
              timestamp: Number(timestamp),
              txHash: log.transactionHash,
            } satisfies ClaimItem;
          })
          .filter((item): item is ClaimItem => item !== null)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_ITEMS);

        setClaims(items);
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  useWatchContractEvent({
    address: CLAIM_ADDRESS,
    abi: claimAbi,
    eventName: "Claimed",
    enabled: IS_CONFIGURED,
    pollingInterval: 4_000,
    onLogs: (logs) => {
      setClaims((previous) => {
        const next = [...previous];
        for (const log of logs) {
          const { wallet, amount, timestamp } = log.args;
          if (
            !wallet ||
            amount === undefined ||
            timestamp === undefined ||
            !log.transactionHash
          ) {
            continue;
          }
          if (next.some((item) => item.txHash === log.transactionHash)) continue;
          next.unshift({
            wallet,
            amount,
            timestamp: Number(timestamp),
            txHash: log.transactionHash,
          });
        }
        return next
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_ITEMS);
      });
    },
  });

  return (
    <section
      id="activity"
      className="section-shell scroll-mt-28 pb-16 sm:pb-24"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="size-3.5 text-brand" />
            <p className="text-[9px] uppercase tracking-[0.22em] text-brand">
              Live activity
            </p>
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-paper sm:text-4xl">
            Recent claims.
          </h2>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-mint/20 bg-mint/[0.06] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-mint">
          <span className="live-dot" />
          Streaming
        </span>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-paper/[0.08] bg-ink/55">
        <div className="hidden grid-cols-[1.6fr_1fr_0.8fr_auto] gap-4 border-b border-paper/[0.07] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-paper-mute sm:grid">
          <span>Wallet</span>
          <span>Amount</span>
          <span>When</span>
          <span className="sr-only">Transaction</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-paper/[0.06]">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="flex items-center gap-4 px-5 py-4"
                aria-hidden="true"
              >
                <div className="size-8 animate-pulse rounded-full bg-paper/[0.06]" />
                <div className="h-3 w-28 animate-pulse rounded-full bg-paper/[0.06]" />
                <div className="ml-auto h-3 w-16 animate-pulse rounded-full bg-paper/[0.05]" />
              </div>
            ))}
          </div>
        ) : claims.length > 0 ? (
          <div className="divide-y divide-paper/[0.06]">
            {claims.map((claim) => (
              <div
                key={`${claim.txHash}-${claim.wallet}`}
                className="group grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 transition hover:bg-paper/[0.025] sm:grid-cols-[1.6fr_1fr_0.8fr_auto] sm:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <TokenMark size={30} />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-paper">
                      {shortAddress(claim.wallet)}
                    </p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-paper-mute sm:hidden">
                      {formatRelative(claim.timestamp, now || undefined)}
                    </p>
                  </div>
                </div>
                <p className="tabular justify-self-end font-mono text-xs text-paper sm:justify-self-start">
                  {formatAmount(claim.amount, decimals, 2)}{" "}
                  <span className="text-[9px] uppercase tracking-[0.12em] text-brand">
                    ELYZ
                  </span>
                </p>
                <p className="hidden font-mono text-[10px] text-paper-mute sm:block">
                  {formatRelative(claim.timestamp, now || undefined)}
                </p>
                <a
                  href={explorerTx(claim.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View claim transaction ${claim.txHash}`}
                  className="flex size-8 items-center justify-center rounded-full border border-paper/[0.08] text-paper-mute transition group-hover:border-brand/30 group-hover:text-brand"
                >
                  <ArrowUpRight className="size-3.5" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-paper">
              {error ? "Live feed unavailable" : "No claims in this window yet."}
            </p>
            <p className="mt-1 text-[11px] text-paper-mute">
              {error
                ? "The Elysium RPC did not return recent events. New claims will still appear live."
                : "Connect your wallet and be the first name on the board."}
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] text-paper-mute/70">
        Showing claims from the last {LOOKBACK_BLOCKS.toLocaleString()} Elysium
        blocks. New events stream in live.
      </p>
    </section>
  );
}
