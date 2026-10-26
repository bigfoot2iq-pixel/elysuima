"use client";

import { useState } from "react";
import { useChainModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAccount, useBalance, useWalletClient } from "wagmi";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Clock3,
  Copy,
  Droplets,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { elysiumTestnet, getElysiumChain } from "@/lib/chains";
import { FAUCET_CHAIN_ID, LINKS } from "@/lib/config";
import { formatAmount, formatCountdown, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

type FaucetStatus = {
  configured: boolean;
  chainId: number;
  amount: string;
  cooldownMs: number;
  faucetAddress: string | null;
  faucetBalance: string | null;
  lastClaimAt: number | null;
  nextClaimAt: number | null;
  officialUrl: string;
};

type ClaimResponse = {
  transactionHash?: string;
  amount?: string;
  explorerUrl?: string;
  error?: string;
  message?: string;
  nextClaimAt?: number;
};

function safeAmount(value: string | undefined | null) {
  if (!value) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function cooldownLabel(ms: number) {
  const hours = ms / 3_600_000;
  if (Number.isInteger(hours)) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

async function fetchStatus(address?: string): Promise<FaucetStatus> {
  const response = await fetch(
    `/api/faucet${address ? `?address=${encodeURIComponent(address)}` : ""}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`The faucet status returned HTTP ${response.status}.`);
  }

  return (await response.json()) as FaucetStatus;
}

/**
 * The claim card on /faucet. It reads the wallet session already used by the
 * header, the launchpad, and the reward claim, so the address is filled in
 * without a second connect step. The official Kinetiq faucet remains the
 * fallback when this deployment has no funded drip wallet.
 */
export function InAppFaucet() {
  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const { data: walletClient } = useWalletClient();
  const now = useNow();
  const chain = getElysiumChain(FAUCET_CHAIN_ID);

  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<{
    hash: string;
    explorerUrl: string;
    amount: string;
  } | null>(null);

  const statusQuery = useQuery<FaucetStatus>({
    queryKey: ["faucet-status", address?.toLowerCase() ?? "guest"],
    queryFn: () => fetchStatus(address),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const balanceQuery = useBalance({
    address,
    chainId: FAUCET_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const status = statusQuery.data;
  const amountWei = safeAmount(status?.amount);
  const amountLabel = formatAmount(amountWei, 18, 4) || "0.01";
  const cooldown = cooldownLabel(status?.cooldownMs ?? 86_400_000);
  const faucetBalance =
    status?.faucetBalance !== null && status?.faucetBalance !== undefined
      ? safeAmount(status.faucetBalance)
      : null;
  const faucetEmpty = faucetBalance !== null && faucetBalance < amountWei;

  const nowReady = now > 0;
  const nextClaimSeconds = status?.nextClaimAt
    ? Math.floor(status.nextClaimAt / 1_000)
    : null;
  const cooldownLeft =
    nowReady && nextClaimSeconds ? Math.max(0, nextClaimSeconds - now) : 0;
  const inCooldown = nextClaimSeconds !== null && nowReady && cooldownLeft > 0;
  const cooldownUnknown = nextClaimSeconds !== null && !nowReady;

  const wrongChain = isConnected && chainId !== FAUCET_CHAIN_ID;
  const officialUrl = status?.officialUrl ?? LINKS.faucet;

  async function copyAddress() {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Wallet address copied", {
        description: "Paste it into the official faucet if you use the fallback.",
      });
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error("Could not copy the wallet address");
    }
  }

  async function addOrSwitchTestnet() {
    try {
      if (walletClient) {
        // Add first so wallets that have never seen chain 99801 can switch.
        await walletClient
          .addChain({ chain: elysiumTestnet })
          .catch(() => undefined);
        await walletClient.switchChain({ id: FAUCET_CHAIN_ID });
        toast.success("Wallet switched to Elysium Testnet");
        return;
      }
    } catch {
      // Rejections and unsupported wallets fall back to the chain modal.
    }

    openChainModal?.();
  }

  async function claim() {
    if (!address) return;

    setClaiming(true);
    setClaimError(null);

    try {
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | ClaimResponse
        | null;

      if (!response.ok || !payload?.transactionHash) {
        if (payload?.error === "COOLDOWN") {
          void statusQuery.refetch();
        }
        throw new Error(
          payload?.message ?? `The faucet returned HTTP ${response.status}.`,
        );
      }

      const claimedAmount = safeAmount(payload.amount);
      setReceipt({
        hash: payload.transactionHash,
        explorerUrl: payload.explorerUrl ?? "",
        amount: claimedAmount.toString(),
      });
      setClaimError(null);
      toast.success("Testnet HYPE sent", {
        description: `${formatAmount(claimedAmount, 18, 4)} HYPE is on its way to your wallet.`,
      });

      await Promise.all([statusQuery.refetch(), balanceQuery.refetch()]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The faucet claim could not be completed.";
      setClaimError(message);
      toast.error("Faucet claim failed", { description: message });
    } finally {
      setClaiming(false);
    }
  }

  return (
    <section className="section-shell pb-12" aria-labelledby="in-app-faucet">
      <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-12">
        <div>
          <p className="eyebrow">In-app claim</p>
          <h2
            id="in-app-faucet"
            className="mt-4 max-w-[20ch] font-display text-[clamp(1.7rem,3.6vw,2.6rem)] font-extrabold leading-[1.02] tracking-[-0.04em] text-paper"
          >
            HYPE, straight to the wallet you already connected.
          </h2>
          <p className="mt-4 max-w-md text-[12px] leading-6 text-paper-dim">
            No new tab and no second connect. The claim uses the same wallet
            session as the launchpad, so the address is already filled in.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <MiniStat label="Per claim" value={`${amountLabel} HYPE`} />
            <MiniStat label="Cooldown" value={cooldown} />
            <MiniStat label="Network" value={`Chain ${FAUCET_CHAIN_ID}`} />
          </div>

          <div className="mt-6 flex items-start gap-2 text-[11px] leading-5 text-paper-mute">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" />
            <p>
              The drip is sent from a capped faucet wallet on {chain.name}.
              Testnet funds only — never send real assets here.
            </p>
          </div>
        </div>

        <div className="glass card-sheen relative overflow-hidden rounded-[28px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper-mute">
                Your wallet
              </p>
              <p className="mt-1 text-[13px] font-semibold text-paper">
                {isConnected ? "Connected" : "Not connected"}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em]",
                isConnected
                  ? "border-mint/25 bg-mint/[0.07] text-mint"
                  : "border-paper/10 bg-paper/[0.03] text-paper-mute",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isConnected
                    ? "bg-mint shadow-[0_0_8px_rgba(125,240,196,0.8)]"
                    : "bg-paper-mute",
                )}
              />
              {isConnected ? "Ready" : "Connect"}
            </span>
          </div>

          {!isConnected ? (
            <div className="mt-5 rounded-2xl border border-paper/[0.08] bg-ink/40 p-4">
              <p className="text-[11px] leading-5 text-paper-mute">
                Connect the wallet you use across Elyziuma. The faucet fills in
                the address automatically and keeps the same session.
              </p>
              <button
                type="button"
                onClick={openConnectModal}
                className="btn-primary mt-4 h-11 w-full"
              >
                <Wallet className="size-4" />
                Connect wallet
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-2xl border border-paper/[0.08] bg-ink/40 p-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Wallet className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[12px] text-paper">
                      {shortAddress(address, 6)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-paper-mute">
                      Balance on testnet ·{" "}
                      {balanceQuery.data
                        ? `${formatAmount(
                            balanceQuery.data.value,
                            balanceQuery.data.decimals,
                            4,
                          )} HYPE`
                        : balanceQuery.isPending
                          ? "reading…"
                          : "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyAddress()}
                    aria-label="Copy wallet address"
                    className="flex size-8 items-center justify-center rounded-lg border border-paper/10 text-paper-dim transition hover:border-brand/40 hover:text-brand"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-mint" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {wrongChain ? (
                <button
                  type="button"
                  onClick={() => void addOrSwitchTestnet()}
                  className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-warn/25 bg-warn/[0.06] px-3.5 py-2.5 text-left transition hover:bg-warn/[0.1]"
                >
                  <span className="flex items-center gap-2 text-[11px] text-warn">
                    <AlertTriangle className="size-3.5" />
                    Your wallet is on another network
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-warn">
                    Add testnet →
                  </span>
                </button>
              ) : null}

              <div className="my-5 hairline" />

              {receipt ? (
                <div className="rounded-2xl border border-mint/25 bg-mint/[0.06] p-4 text-center">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-mint/15 text-mint">
                    <Check className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-paper">
                    {formatAmount(safeAmount(receipt.amount), 18, 4)} HYPE sent
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-paper-mute">
                    The drip was broadcast to Elysium. Gas is paid by the
                    faucet.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {receipt.explorerUrl ? (
                      <a
                        href={receipt.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost h-10 text-[11px]"
                      >
                        View transaction
                        <ArrowUpRight className="size-3" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setReceipt(null);
                        void statusQuery.refetch();
                      }}
                      className="text-[10px] uppercase tracking-[0.16em] text-paper-mute transition hover:text-paper"
                    >
                      Claim again later
                    </button>
                  </div>
                </div>
              ) : statusQuery.isError ? (
                <div className="rounded-2xl border border-danger/25 bg-danger/[0.06] p-4">
                  <p className="text-xs font-semibold text-danger">
                    The faucet is unreachable
                  </p>
                  <p className="mt-1.5 text-[11px] leading-5 text-paper-mute">
                    The status check failed. Retry, or use one of the official
                    faucets below.
                  </p>
                  <button
                    type="button"
                    onClick={() => void statusQuery.refetch()}
                    className="btn-ghost mt-3 h-10 w-full text-[11px]"
                  >
                    <RefreshCw className="size-3.5" />
                    Retry
                  </button>
                </div>
              ) : statusQuery.isPending ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-paper-mute">
                  <Loader2 className="size-4 animate-spin text-brand" />
                  Checking the faucet…
                </div>
              ) : status && !status.configured ? (
                <div className="rounded-2xl border border-warn/25 bg-warn/[0.06] p-4">
                  <p className="text-xs font-semibold text-warn">
                    Claim on the official faucet
                  </p>
                  <p className="mt-1.5 text-[11px] leading-5 text-paper-mute">
                    This deployment hands the drip to Kinetiq&apos;s faucet. Your
                    wallet address is copied so you can paste it there.
                  </p>
                  <a
                    href={officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => void copyAddress()}
                    className="btn-primary mt-3 h-11 w-full px-4 text-xs"
                  >
                    Open official faucet
                    <ArrowUpRight className="size-3.5" />
                  </a>
                </div>
              ) : cooldownUnknown ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-paper-mute">
                  <Loader2 className="size-4 animate-spin text-brand" />
                  Checking your cooldown…
                </div>
              ) : inCooldown ? (
                <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4 text-center">
                  <p className="flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-paper-mute">
                    <Clock3 className="size-3.5" />
                    Next claim
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold tabular text-paper">
                    {formatCountdown(cooldownLeft)}
                  </p>
                  <p className="mt-1 text-[10px] text-paper-mute">
                    Each wallet can claim once every {cooldown}.
                  </p>
                </div>
              ) : faucetEmpty ? (
                <div className="rounded-2xl border border-warn/25 bg-warn/[0.06] p-4 text-center">
                  <p className="text-xs font-semibold text-warn">
                    The faucet is refilling
                  </p>
                  <p className="mt-1.5 text-[11px] leading-5 text-paper-mute">
                    The drip wallet is low on testnet HYPE. Try again soon, or
                    use one of the official faucets below.
                  </p>
                  <a
                    href={officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => void copyAddress()}
                    className="btn-ghost mt-3 h-10 w-full text-[11px]"
                  >
                    Official faucet
                    <ArrowUpRight className="size-3" />
                  </a>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void claim()}
                    disabled={claiming}
                    className="btn-primary h-12 w-full"
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending HYPE…
                      </>
                    ) : (
                      <>
                        <Droplets className="size-4" />
                        Claim {amountLabel} HYPE
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-[10px] text-paper-mute">
                    Sent instantly to the connected wallet. No gas required from
                    you.
                  </p>
                  {claimError ? (
                    <p
                      role="alert"
                      className="mt-2 text-center text-[11px] text-danger"
                    >
                      {claimError}
                    </p>
                  ) : null}
                </>
              )}

              <div className="mt-5 flex items-center justify-between gap-2 border-t border-paper/[0.07] pt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-paper-mute">
                <span>
                  {status?.configured
                    ? "Elyziuma faucet"
                    : "Official Kinetiq faucet"}
                </span>
                {faucetBalance !== null ? (
                  <span>{formatAmount(faucetBalance, 18, 3)} HYPE left</span>
                ) : (
                  <a
                    href={officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 transition hover:text-brand"
                  >
                    Fallback
                    <ArrowUpRight className="size-3" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-paper/[0.08] bg-paper/[0.03] px-3.5 py-2.5">
      <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-paper-mute">
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold capitalize text-paper">{value}</p>
    </div>
  );
}
