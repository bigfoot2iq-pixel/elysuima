"use client";

import { useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useSwitchChain } from "wagmi";
import {
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { getElysiumChain } from "@/lib/chains";
import { CLAIM_CHAIN_ID, IS_CONFIGURED } from "@/lib/config";
import { formatAmount } from "@/lib/format";
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

export function HolderClaimCard() {
  const {
    address,
    chainId,
    data,
    nft,
    symbol,
    decimals,
    paused,
    claimEligibility,
    refresh,
  } = useClaimData();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const [checkedAddress, setCheckedAddress] = useState<string | null>(null);
  const hasChecked =
    Boolean(address) &&
    checkedAddress?.toLowerCase() === address?.toLowerCase();

  const { phase, hash, error, claimNft } = useClaimFlow({
    onSuccess: refresh,
  });

  const nftPoolRemaining = BigInt(data?.pools.nftRemaining ?? "0");
  const nftClaimable = BigInt(nft?.claimableAmount ?? "0");
  const maxBatch = nft?.maxBatch ?? 50;
  const claimableIds = (nft?.claimableTokenIds ?? [])
    .slice(0, maxBatch)
    .map((id) => BigInt(id));
  const claimableBatchAmount = nft
    ? BigInt(claimableIds.length) * BigInt(nft.rewardPerNft)
    : 0n;
  const unclaimedCount = nft?.claimableTokenIds.length ?? 0;
  const hasMoreNfts = unclaimedCount > claimableIds.length;
  const nftBalance = BigInt(nft?.balance ?? "0");
  const claimedNftCount = nft?.claimedTokenIds.length ?? 0;
  const checking =
    Boolean(address) && hasChecked && claimEligibility.isFetching;
  const showData = Boolean(hasChecked && !checking && nft);

  const busy =
    phase === "authorizing" || phase === "submitting" || phase === "pending";

  const label = (() => {
    if (!IS_CONFIGURED) return "Claim not live yet";
    if (!address) return "Connect wallet";
    if (!hasChecked) return "Check eligibility";
    if (checking) return "Checking your NFTs…";
    if (phase === "success") return "Claimed";
    if (claimEligibility.isError || !nft) return "Retry NFT check";
    if (paused) return "Claims paused";
    if (busy) {
      if (phase === "authorizing") return "Switching network…";
      if (phase === "submitting") return "Confirm in wallet…";
      return "Claiming…";
    }
    if (nftBalance === 0n) return "No NFTs to claim";
    if (unclaimedCount === 0) return "All NFT rewards claimed";
    if (nftPoolRemaining === 0n) return "NFT pool empty";
    if (chainId !== CLAIM_CHAIN_ID) return `Switch to ${claimChain.label}`;

    const amount = hasMoreNfts ? claimableBatchAmount : nftClaimable;
    return `Claim ${formatAmount(amount, decimals, 0)} ${symbol}`;
  })();

  const detail = (() => {
    if (!address) return "Connect the wallet holding your Elyziuma NFTs.";
    if (!hasChecked) {
      return "Check this wallet's Elyziuma NFT holdings on Elysium to see what you can claim.";
    }
    if (checking) return "Reading your Elyziuma NFT holdings on Elysium…";
    if (claimEligibility.isError) {
      return "The NFT check could not be reached. Retry to load your holdings.";
    }
    if (!nft) return "No holdings were returned. Retry the check.";
    if (nftBalance === 0n) {
      return "This wallet holds 0 Elyziuma NFTs, so there is no holder reward to claim.";
    }
    if (unclaimedCount === 0) {
      return `All ${formatAmount(nftBalance, 0, 0)} NFT reward${
        nftBalance === 1n ? "" : "s"
      } already claimed. A claimed NFT stays claimed after transfer.`;
    }
    if (hasMoreNfts) {
      return `${formatAmount(
        BigInt(claimableIds.length),
        0,
        0,
      )} of ${formatAmount(
        BigInt(unclaimedCount),
        0,
        0,
      )} ready rewards are included in this claim. Up to ${maxBatch} NFTs are paid per transaction.`;
    }
    return `You hold ${formatAmount(
      nftBalance,
      0,
      0,
    )} Elyziuma NFT${
      nftBalance === 1n ? "" : "s"
    }. Each eligible NFT pays 10,000 ELYZ once.`;
  })();

  const amountLabel = !hasChecked
    ? "eligibility not checked"
    : checking
      ? "checking holdings"
      : !nft
        ? "no holdings data"
        : nftBalance === 0n
          ? "0 NFTs held"
          : unclaimedCount === 0
            ? "all rewards claimed"
            : "claimable now";

  const status: { tone: ClaimTone; label: string } = (() => {
    if (!IS_CONFIGURED) return { tone: "muted", label: "Preview" };
    if (!address) return { tone: "muted", label: "Wallet needed" };
    if (!hasChecked) return { tone: "muted", label: "Not checked" };
    if (checking) return { tone: "brand", label: "Checking" };
    if (claimEligibility.isError) return { tone: "warn", label: "Unavailable" };
    if (paused) return { tone: "danger", label: "Paused" };
    if (phase === "success") return { tone: "mint", label: "Claimed" };
    if (!nft) return { tone: "warn", label: "Unavailable" };
    if (nftBalance === 0n) return { tone: "muted", label: "No NFTs" };
    if (unclaimedCount === 0) return { tone: "mint", label: "Complete" };
    if (nftPoolRemaining === 0n) return { tone: "warn", label: "Empty" };
    return { tone: "mint", label: "Open" };
  })();

  const disabled = (() => {
    if (!IS_CONFIGURED) return true;
    if (busy) return true;
    if (!address) return false;
    if (!hasChecked) return false;
    if (checking) return true;
    if (claimEligibility.isError || !nft) return false;
    if (paused || phase === "success") return true;
    if (nftBalance === 0n || unclaimedCount === 0 || nftPoolRemaining === 0n) {
      return true;
    }
    return false;
  })();

  const buttonIcon = !address ? (
    <Wallet className="size-4" />
  ) : !hasChecked ? (
    <Search className="size-4" />
  ) : checking ? (
    <Loader2 className="size-4 animate-spin" />
  ) : claimEligibility.isError || !nft ? (
    <RefreshCw className="size-4" />
  ) : undefined;

  async function handleAction() {
    if (!IS_CONFIGURED) return;

    if (!address) {
      openConnectModal?.();
      return;
    }

    if (!hasChecked) {
      setCheckedAddress(address);
      void claimEligibility.refetch();
      return;
    }

    if (checking) return;

    if (claimEligibility.isError || !nft) {
      void claimEligibility.refetch();
      return;
    }

    if (paused || busy || phase === "success") return;

    if (
      nftBalance === 0n ||
      unclaimedCount === 0 ||
      nftPoolRemaining === 0n
    ) {
      return;
    }

    if (chainId !== CLAIM_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: CLAIM_CHAIN_ID });
      } catch {
        toast.error("Could not switch network", {
          description: `Add ${claimChain.name} to your wallet and try again.`,
        });
      }
      return;
    }

    if (claimableIds.length === 0) return;
    void claimNft(claimableIds);
  }

  return (
    <article className="card-sheen glass relative flex h-full flex-col rounded-[28px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-paper-mute">
              NFT holders
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-[-0.02em] text-paper">
              Holder claim
            </h2>
          </div>
        </div>
        <ClaimStatusBadge tone={status.tone}>{status.label}</ClaimStatusBadge>
      </div>

      <div className="mt-6">
        <div className="flex items-end gap-2">
          <span className="tabular truncate font-mono text-[clamp(2.6rem,6vw,3.8rem)] font-semibold leading-[0.85] tracking-[-0.07em] text-paper">
            {showData ? formatAmount(nftClaimable, decimals, 0) : "—"}
          </span>
          <span className="mb-1 shrink-0 text-[11px] font-bold tracking-[0.2em] text-brand">
            {symbol}
          </span>
        </div>
        <p className="mt-2 text-xs text-paper-dim">{amountLabel}</p>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-paper/[0.08] bg-paper/[0.06]">
        <ClaimStat
          value={showData ? formatAmount(nftBalance, 0, 0) : "—"}
          label="NFTs held"
        />
        <ClaimStat
          value={showData ? formatAmount(BigInt(unclaimedCount), 0, 0) : "—"}
          label="Ready"
        />
        <ClaimStat
          value={
            showData ? formatAmount(BigInt(claimedNftCount), 0, 0) : "—"
          }
          label="Claimed"
        />
      </dl>

      <p className="mt-4 min-h-10 text-[11px] leading-5 text-paper-mute">
        {detail}
      </p>

      <div className="mt-auto">
        <button
          type="button"
          onClick={() => void handleAction()}
          disabled={disabled}
          aria-busy={busy || checking}
          className="btn-primary mt-5 w-full"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : buttonIcon}
          {label}
        </button>
      </div>

      {phase === "success" && hash ? <ClaimSuccessPanel hash={hash} /> : null}
      {error ? <ClaimError message={error} /> : null}

      <ClaimCardFooter fee={0n} />
    </article>
  );
}
