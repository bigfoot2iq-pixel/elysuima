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
import { CLAIM_CHAIN_ID, IS_CONFIGURED } from "@/lib/config";
import { formatAmount, formatCompact } from "@/lib/format";
import { useClaimFlow } from "@/hooks/use-claim-flow";
import { useClaimData } from "./claim-data";
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
    symbol,
    decimals,
    paused,
    eligibility,
    claimEligibility,
    thresholdEligible,
    bestClaimChain,
    refresh,
  } = useClaimData();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();

  const { phase, hash, error, claimCommunity } = useClaimFlow({
    onSuccess: refresh,
  });

  const communityClaimable = BigInt(community?.claimableAmount ?? "0");
  const communityFee = BigInt(community?.claimFee ?? "0");
  const communityPoolRemaining = BigInt(
    data?.pools.communityRemaining ?? "0",
  );
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

  const detail = (() => {
    if (!address) return "Connect the wallet you want to claim with.";
    if (checking) return "Checking your mainnet ETH and HYPE balances…";
    if (eligibility.isError) {
      return "The mainnet balance check is unavailable. Retry to continue.";
    }
    if (community?.claimed) {
      return "This wallet has already claimed its 1,000 ELYZ. You can still claim any eligible NFT rewards on the left.";
    }
    if (!thresholdEligible) {
      return "The community claim requires 0.001 ETH on Ethereum, 0.05 HYPE on Hyperliquid, or 0.005 HYPE on HyperEVM. These are mainnet balances.";
    }
    if (claimEligibility.isError) {
      return "The community reward could not be read. Retry to continue.";
    }
    if (!community) return "Reading the community pool from Elysium…";
    if (communityPoolRemaining === 0n) {
      return "The community pool is empty right now. Check back after a top-up.";
    }
    return `Eligible via ${bestClaimChain}. One claim per wallet; the HYPE fee is set by the owner.`;
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
    if (!thresholdEligible) return { tone: "muted", label: "Locked" };
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
              All wallets
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-[-0.02em] text-paper">
              Community claim
            </h2>
          </div>
        </div>
        <ClaimStatusBadge tone={status.tone}>{status.label}</ClaimStatusBadge>
      </div>

      <div className="mt-6">
        <div className="flex items-end gap-2">
          <span className="tabular truncate font-mono text-[clamp(2.6rem,6vw,3.8rem)] font-semibold leading-[0.85] tracking-[-0.07em] text-paper">
            {community ? formatAmount(communityClaimable, decimals, 0) : "—"}
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
            data
              ? `${formatCompact(communityPoolRemaining, decimals)}`
              : "—"
          }
          label="ELYZ left"
        />
        <ClaimStat
          value={community ? formatAmount(communityFee, 18, 6) : "—"}
          label="HYPE fee"
        />
      </dl>

      <p className="mt-4 min-h-10 text-[11px] leading-5 text-paper-mute">
        {detail}
      </p>

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

      <ClaimCardFooter fee={community ? communityFee : undefined} />
    </article>
  );
}
