"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useSwitchChain } from "wagmi";
import {
  Loader2,
  LockKeyhole,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { getElysiumChain } from "@/lib/chains";
import {
  CLAIM_CHAIN_ID,
  IS_CONFIGURED,
  TOKENOMICS,
} from "@/lib/config";
import { formatAmount, formatCompact } from "@/lib/format";
import { useClaimFlow } from "@/hooks/use-claim-flow";
import { useClaimData } from "./claim-data";
import { CommunityEligibilityCheck } from "./community-eligibility-check";
import {
  ClaimCardFooter,
  ClaimError,
  ClaimStat,
  ClaimStatusBadge,
  ClaimSuccessPanel,
  type ClaimTone,
} from "./claim-ui";

const claimChain = getElysiumChain(CLAIM_CHAIN_ID);

export function CommunityClaimCard() {
  const {
    address,
    chainId,
    data,
    community,
    communityPoolRemaining: chainCommunityPoolRemaining,
    communityClaimFee: chainCommunityClaimFee,
    symbol,
    decimals,
    paused,
    eligibility,
    claimEligibility,
    thresholdEligible,
    refresh,
  } = useClaimData();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();

  const { phase, hash, error, claimCommunity } = useClaimFlow({
    onSuccess: refresh,
  });

  // The reward is a contract constant, so the card can show it before a wallet
  // connects. The live claim status still replaces it with 0 once claimed.
  const communityClaimable = community
    ? BigInt(community.claimableAmount)
    : TOKENOMICS.communityReward;
  const communityFee = community
    ? BigInt(community.claimFee)
    : (chainCommunityClaimFee ?? 0n);
  const communityFeeKnown =
    Boolean(community) || chainCommunityClaimFee !== undefined;
  const communityPoolRemaining =
    chainCommunityPoolRemaining ??
    (data ? BigInt(data.pools.communityRemaining) : undefined);
  const checking =
    Boolean(address) && eligibility.isLoading && !eligibility.data;

  const busy =
    phase === "authorizing" || phase === "submitting" || phase === "pending";

  const label = (() => {
    if (!IS_CONFIGURED) return "Claim not live yet";
    if (!address) return "Connect wallet";
    if (chainId !== CLAIM_CHAIN_ID) return `Switch to ${claimChain.label}`;
    if (busy) {
      if (phase === "authorizing") return "Switching network…";
      if (phase === "submitting") return "Confirm in wallet…";
      return "Claiming…";
    }
    if (phase === "success") return "Claimed";
    if (paused) return "Claims paused";
    if (checking) return "Checking eligibility…";
    if (eligibility.isError) return "Retry balance check";
    if (community?.claimed) return "Already claimed";
    if (!thresholdEligible) return "Not eligible";
    if (claimEligibility.isError) return "Retry claim data";
    if (!community) return "Loading reward…";
    if (communityPoolRemaining === 0n) return "Community pool empty";
    return `Claim ${formatAmount(communityClaimable, decimals, 0)} ${symbol}`;
  })();

  const amountLabel = community?.claimed
    ? "already claimed"
    : "claimable once";

  const status: { tone: ClaimTone; label: string } = (() => {
    if (!IS_CONFIGURED) return { tone: "muted", label: "Preview" };
    if (paused) return { tone: "danger", label: "Paused" };
    if (phase === "success") return { tone: "mint", label: "Claimed" };
    if (!address) return { tone: "muted", label: "Wallet needed" };
    if (checking) return { tone: "brand", label: "Checking" };
    if (eligibility.isError) return { tone: "warn", label: "Unavailable" };
    if (community?.claimed) return { tone: "mint", label: "Complete" };
    if (!thresholdEligible) return { tone: "muted", label: "Not eligible" };
    if (claimEligibility.isError) return { tone: "warn", label: "Unavailable" };
    if (!community) return { tone: "muted", label: "Syncing" };
    if (communityPoolRemaining === 0n) return { tone: "warn", label: "Empty" };
    return { tone: "mint", label: "Open" };
  })();

  const needsRetry = eligibility.isError || claimEligibility.isError;
  const disabled =
    !IS_CONFIGURED ||
    busy ||
    phase === "success" ||
    paused ||
    checking ||
    (!needsRetry &&
      Boolean(address) &&
      chainId === CLAIM_CHAIN_ID &&
      (!thresholdEligible ||
        !community ||
        (community !== undefined &&
          (communityPoolRemaining === 0n || community.claimed))));

  const buttonIcon = !address ? (
    <Wallet className="size-4" />
  ) : eligibility.isError || claimEligibility.isError ? (
    <RefreshCw className="size-4" />
  ) : !thresholdEligible ? (
    <LockKeyhole className="size-4" />
  ) : !community ? (
    <Loader2 className="size-4 animate-spin" />
  ) : undefined;

  async function prepare(): Promise<boolean> {
    if (!IS_CONFIGURED) return false;

    if (!address) {
      openConnectModal?.();
      return false;
    }

    if (chainId !== CLAIM_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: CLAIM_CHAIN_ID });
      } catch {
        toast.error("Could not switch network", {
          description: `Add ${claimChain.name} to your wallet and try again.`,
        });
      }
      return false;
    }

    if (eligibility.isError) {
      void eligibility.refetch();
      return false;
    }

    if (!thresholdEligible) {
      void eligibility.refetch();
      return false;
    }

    if (claimEligibility.isError) {
      void claimEligibility.refetch();
      return false;
    }

    if (!community || paused || busy || phase === "success") return false;

    return true;
  }

  async function handleClaim() {
    if (!(await prepare())) return;
    if (!community || community.claimed) return;
    void claimCommunity(communityFee);
  }

  return (
    <article className="card-sheen glass relative flex h-full flex-col rounded-[28px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-mint/25 bg-mint/10 text-mint">
            <Users className="size-5" />
          </span>
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-paper-mute">
              Public
            </p>
            <h2 className="mt-1 text-[15px] font-semibold leading-tight tracking-[-0.02em] text-paper">
              ELYZIUMA Community claim
            </h2>
          </div>
        </div>
        <ClaimStatusBadge tone={status.tone}>{status.label}</ClaimStatusBadge>
      </div>

      <div className="mt-6">
        <div className="flex items-end gap-2">
          <span className="tabular truncate font-mono text-[clamp(2.6rem,6vw,3.8rem)] font-semibold leading-[0.85] tracking-[-0.07em] text-paper">
            {formatAmount(communityClaimable, decimals, 0)}
          </span>
          <span className="mb-1 shrink-0 text-[11px] font-bold tracking-[0.2em] text-mint">
            {symbol}
          </span>
        </div>
        <p className="mt-2 text-xs text-paper-dim">{amountLabel}</p>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-paper/[0.08] bg-paper/[0.06]">
        <ClaimStat value="1" label="Per wallet" />
        <ClaimStat
          value={
            communityPoolRemaining !== undefined
              ? formatCompact(communityPoolRemaining, decimals)
              : "—"
          }
          label="ELYZ left"
        />
        <ClaimStat
          value={communityFeeKnown ? formatAmount(communityFee, 18, 6) : "—"}
          label="HYPE fee"
        />
      </dl>

      {community?.claimed ? (
        <div className="mt-5 rounded-2xl border border-mint/20 bg-mint/[0.05] px-3.5 py-3">
          <p className="text-[11px] font-semibold text-mint">
            Community reward already claimed
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-paper-mute">
            This wallet has received its 1,000 ELYZ. Eligible NFT rewards are
            still claimable on the left.
          </p>
        </div>
      ) : (
        <CommunityEligibilityCheck
          address={address}
          data={eligibility.data}
          isPending={eligibility.isLoading}
          isError={eligibility.isError}
          isFetching={eligibility.isFetching}
          onRetry={() => void eligibility.refetch()}
        />
      )}

      <div className="mt-auto">
        <button
          type="button"
          onClick={() => void handleClaim()}
          disabled={disabled}
          aria-busy={busy}
          className="btn-primary mt-5 w-full"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : buttonIcon}
          {label}
        </button>
      </div>

      {phase === "success" && hash ? <ClaimSuccessPanel hash={hash} /> : null}
      {error ? <ClaimError message={error} /> : null}

      <ClaimCardFooter fee={communityFeeKnown ? communityFee : undefined} />
    </article>
  );
}
