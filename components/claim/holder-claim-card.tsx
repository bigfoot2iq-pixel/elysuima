"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useSwitchChain } from "wagmi";
import {
  Loader2,
  RefreshCw,
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
    Boolean(address) && claimEligibility.isLoading && !claimEligibility.data;

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
    if (checking) return "Checking your NFTs…";
    if (claimEligibility.isError) return "Retry NFT check";
    if (!nft) return "Checking your NFTs…";
    if (nftBalance === 0n) return "No NFTs to claim";
    if (unclaimedCount === 0) return "All NFT rewards claimed";
    if (nftPoolRemaining === 0n) return "NFT pool empty";

    const amount = hasMoreNfts ? claimableBatchAmount : nftClaimable;
    return `Claim ${formatAmount(amount, decimals, 0)} ${symbol}`;
  })();

  const detail = (() => {
    if (!address) return "Connect the wallet holding your Elyziuma NFTs.";
    if (checking) return "Reading your Elyziuma NFT balance on Elysium…";
    if (claimEligibility.isError) {
      return "The NFT check could not be reached. Retry to load your holdings.";
    }
    if (!nft) return "Checking your Elyziuma NFT holdings…";
    if (nftBalance === 0n) {
      return "No Elyziuma NFTs in this wallet yet. Mint one to unlock 10,000 ELYZ.";
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

  const amountLabel = !nft
    ? "checking holdings"
    : nftBalance === 0n
      ? "no NFTs held"
      : unclaimedCount === 0
        ? "all rewards claimed"
        : "claimable now";

  const status: { tone: ClaimTone; label: string } = (() => {
    if (!IS_CONFIGURED) return { tone: "muted", label: "Preview" };
    if (paused) return { tone: "danger", label: "Paused" };
    if (phase === "success") return { tone: "mint", label: "Claimed" };
    if (!address) return { tone: "muted", label: "Wallet needed" };
    if (claimEligibility.isError) return { tone: "warn", label: "Unavailable" };
    if (checking) return { tone: "brand", label: "Checking" };
    if (!nft) return { tone: "muted", label: "Syncing" };
    if (nftBalance === 0n) return { tone: "muted", label: "No NFTs" };
    if (unclaimedCount === 0) return { tone: "mint", label: "Complete" };
    if (nftPoolRemaining === 0n) return { tone: "warn", label: "Empty" };
    return { tone: "mint", label: "Open" };
  })();

  const disabled =
    !IS_CONFIGURED ||
    busy ||
    phase === "success" ||
    paused ||
    checking ||
    (Boolean(address) && !nft && !claimEligibility.isError) ||
    (Boolean(nft) &&
      (nftPoolRemaining === 0n ||
        nftBalance === 0n ||
        unclaimedCount === 0));

  const buttonIcon = !address ? (
    <Wallet className="size-4" />
  ) : claimEligibility.isError ? (
    <RefreshCw className="size-4" />
  ) : !nft ? (
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

    if (claimEligibility.isError) {
      void claimEligibility.refetch();
      return false;
    }

    if (!nft || paused || busy || phase === "success") return false;

    return true;
  }

  async function handleClaim() {
    if (!(await prepare())) return;
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
            {nft ? formatAmount(nftClaimable, decimals, 0) : "—"}
          </span>
          <span className="mb-1 shrink-0 text-[11px] font-bold tracking-[0.2em] text-brand">
            {symbol}
          </span>
        </div>
        <p className="mt-2 text-xs text-paper-dim">{amountLabel}</p>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-paper/[0.08] bg-paper/[0.06]">
        <ClaimStat
          value={nft ? formatAmount(nftBalance, 0, 0) : "—"}
          label="NFTs held"
        />
        <ClaimStat
          value={nft ? formatAmount(BigInt(unclaimedCount), 0, 0) : "—"}
          label="Ready"
        />
        <ClaimStat
          value={nft ? formatAmount(BigInt(claimedNftCount), 0, 0) : "—"}
          label="Claimed"
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

      <ClaimCardFooter fee={0n} />
    </article>
  );
}
