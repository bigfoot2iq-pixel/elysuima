"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  ExternalLink,
  Loader2,
  LockKeyhole,
  Pause,
  Play,
  Settings2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  BaseError,
  formatUnits,
  isAddress,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import { useQuery } from "@tanstack/react-query";
import { claimAbi, tokenAbi } from "@/lib/abis";
import {
  CLAIM_ADDRESS,
  IS_CONFIGURED,
  TOKEN_ADDRESS,
  TOKEN_FALLBACK,
  explorerAddress,
  explorerTx,
} from "@/lib/config";
import { formatAmount, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

type Health = {
  ok: boolean;
  signerConfigured?: boolean;
  signerMatches?: boolean;
  paused?: boolean;
  dailyAmount?: string;
  faucetBalance?: string;
  message?: string;
};

function txError(error: unknown) {
  if (error instanceof BaseError) return error.shortMessage;
  if (error instanceof Error) return error.message.split("\n")[0];
  return "The transaction could not be submitted.";
}

export function AdminDashboard() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();

  const [hash, setHash] = useState<Hash>();
  const [pending, setPending] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState<string | null>(null);
  const [withdrawInput, setWithdrawInput] = useState("");
  const [withdrawTo, setWithdrawTo] = useState<string | null>(null);
  const [signerInput, setSignerInput] = useState<string | null>(null);

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: CLAIM_ADDRESS, abi: claimAbi, functionName: "owner" },
      { address: CLAIM_ADDRESS, abi: claimAbi, functionName: "dailyAmount" },
      { address: CLAIM_ADDRESS, abi: claimAbi, functionName: "paused" },
      { address: CLAIM_ADDRESS, abi: claimAbi, functionName: "signer" },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [CLAIM_ADDRESS],
      },
      { address: CLAIM_ADDRESS, abi: claimAbi, functionName: "totalClaimed" },
      { address: CLAIM_ADDRESS, abi: claimAbi, functionName: "totalClaims" },
      { address: CLAIM_ADDRESS, abi: claimAbi, functionName: "uniqueClaimers" },
      { address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "decimals" },
      { address: TOKEN_ADDRESS, abi: tokenAbi, functionName: "symbol" },
    ],
    query: { enabled: IS_CONFIGURED, refetchInterval: 20_000 },
    allowFailure: true,
  });

  const [
    ownerResult,
    dailyAmountResult,
    pausedResult,
    signerResult,
    faucetBalanceResult,
    totalClaimedResult,
    totalClaimsResult,
    uniqueClaimersResult,
    decimalsResult,
    symbolResult,
  ] = data ?? [];

  const owner =
    ownerResult?.status === "success"
      ? (ownerResult.result as Address)
      : undefined;
  const dailyAmount =
    dailyAmountResult?.status === "success"
      ? (dailyAmountResult.result as bigint)
      : undefined;
  const paused =
    pausedResult?.status === "success"
      ? (pausedResult.result as boolean)
      : false;
  const signer =
    signerResult?.status === "success"
      ? (signerResult.result as Address)
      : undefined;
  const faucetBalance =
    faucetBalanceResult?.status === "success"
      ? (faucetBalanceResult.result as bigint)
      : undefined;
  const totalClaimed =
    totalClaimedResult?.status === "success"
      ? (totalClaimedResult.result as bigint)
      : undefined;
  const totalClaims =
    totalClaimsResult?.status === "success"
      ? (totalClaimsResult.result as bigint)
      : undefined;
  const uniqueClaimers =
    uniqueClaimersResult?.status === "success"
      ? (uniqueClaimersResult.result as bigint)
      : undefined;
  const decimals =
    decimalsResult?.status === "success"
      ? Number(decimalsResult.result)
      : TOKEN_FALLBACK.decimals;
  const symbol =
    symbolResult?.status === "success"
      ? (symbolResult.result as string)
      : TOKEN_FALLBACK.symbol;

  const isOwner =
    Boolean(address) &&
    Boolean(owner) &&
    address!.toLowerCase() === owner!.toLowerCase();

  const health = useQuery<Health>({
    queryKey: ["admin-health"],
    enabled: IS_CONFIGURED,
    refetchInterval: 30_000,
    queryFn: async () => {
      const response = await fetch("/api/health", { cache: "no-store" });
      return (await response.json()) as Health;
    },
  });

  const receipt = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  const amountValue =
    amountInput ??
    (dailyAmount !== undefined ? formatUnits(dailyAmount, decimals) : "");
  const withdrawToValue = withdrawTo ?? address ?? "";
  const signerValue = signerInput ?? signer ?? "";
  const settled = Boolean(hash) && (receipt.isSuccess || receipt.isError);
  const busy = Boolean(pending) && !settled;
  const handledSuccess = useRef<Hash | undefined>(undefined);
  const handledError = useRef<Hash | undefined>(undefined);
  const refetchHealth = health.refetch;

  useEffect(() => {
    if (!hash || !receipt.isSuccess || handledSuccess.current === hash) return;
    handledSuccess.current = hash;
    toast.success("Transaction confirmed", {
      id: hash,
      description: "The claim contract has been updated.",
    });
    void refetch();
    void refetchHealth();
  }, [hash, receipt.isSuccess, refetch, refetchHealth]);

  useEffect(() => {
    if (!hash || !receipt.isError || !receipt.error || handledError.current === hash)
      return;
    handledError.current = hash;
    toast.error("Transaction failed", {
      id: hash,
      description: txError(receipt.error),
    });
  }, [hash, receipt.isError, receipt.error]);

  async function run(label: string, action: () => Promise<Hash>) {
    if (busy) return;
    setHash(undefined);
    setPending(label);
    try {
      const txHash = await action();
      setHash(txHash);
      toast.loading(`${label} submitted`, {
        id: txHash,
        description: "Waiting for confirmation…",
      });
    } catch (error) {
      setPending(null);
      toast.error(`${label} failed`, { description: txError(error) });
    }
  }

  async function updateDailyAmount() {
    try {
      const parsed = parseUnits(amountValue, decimals);
      if (parsed <= 0n) throw new Error("Amount must be greater than zero.");
      await run("Update daily amount", () =>
        writeContractAsync({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "setDailyAmount",
          args: [parsed],
        }),
      );
    } catch (error) {
      toast.error("Invalid amount", { description: txError(error) });
    }
  }

  async function togglePause() {
    await run(paused ? "Unpause claims" : "Pause claims", () =>
      writeContractAsync({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: paused ? "unpause" : "pause",
      }),
    );
  }

  async function withdraw() {
    try {
      if (!isAddress(withdrawToValue)) throw new Error("Enter a valid recipient.");
      const parsed = parseUnits(withdrawInput, decimals);
      if (parsed <= 0n) throw new Error("Amount must be greater than zero.");
      await run("Withdraw tokens", () =>
        writeContractAsync({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "withdraw",
          args: [withdrawToValue, parsed],
        }),
      );
    } catch (error) {
      toast.error("Invalid withdrawal", { description: txError(error) });
    }
  }

  async function updateSigner() {
    try {
      if (!isAddress(signerValue)) throw new Error("Enter a valid signer address.");
      await run("Rotate signer", () =>
        writeContractAsync({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "setSigner",
          args: [signerValue],
        }),
      );
    } catch (error) {
      toast.error("Invalid signer", { description: txError(error) });
    }
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  if (!IS_CONFIGURED) {
    return (
      <div className="section-shell pb-24 pt-12">
        <Notice
          tone="warn"
          title="Contracts are not configured"
          body="Set NEXT_PUBLIC_CLAIM_ADDRESS and NEXT_PUBLIC_TOKEN_ADDRESS in the environment, then restart the app."
        />
      </div>
    );
  }

  return (
    <div className="section-shell pb-20 pt-10 sm:pt-14">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-mute transition hover:text-brand"
          >
            <ArrowLeft className="size-3" />
            Back to claim
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-paper sm:text-4xl">
            Owner console
          </h1>
          <p className="mt-2 max-w-lg text-xs leading-6 text-paper-mute">
            Update the daily amount, pause claims, fund or withdraw the faucet,
            and rotate the claim signer. Every action is a contract transaction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em]",
              paused
                ? "border-danger/25 bg-danger/[0.06] text-danger"
                : "border-mint/25 bg-mint/[0.06] text-mint",
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {paused ? "Paused" : "Live"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-paper/10 bg-paper/[0.03] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
            <LockKeyhole className="size-3" />
            Owner only
          </span>
        </div>
      </div>

      {!address ? (
        <div className="mt-8">
          <div className="glass flex flex-col items-start gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Wallet className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-paper">
                  Connect the owner wallet
                </p>
                <p className="mt-1 text-xs leading-5 text-paper-mute">
                  The admin console reads the owner address from the contract.
                  Connect a wallet to see if it has permission.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openConnectModal}
              className="btn-primary w-full px-6 sm:w-auto"
            >
              Connect wallet
            </button>
          </div>
        </div>
      ) : !isOwner ? (
        <div className="mt-8 space-y-4">
          <Notice
            tone="warn"
            title="This wallet is not the owner"
            body={`The owner is ${owner ?? "not available"}. Connect the owner wallet to change settings.`}
          />
          <ReadOnlyStats
            totalClaimed={totalClaimed}
            totalClaims={totalClaims}
            uniqueClaimers={uniqueClaimers}
            faucetBalance={faucetBalance}
            decimals={decimals}
            symbol={symbol}
          />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <ReadOnlyStats
            totalClaimed={totalClaimed}
            totalClaims={totalClaims}
            uniqueClaimers={uniqueClaimers}
            faucetBalance={faucetBalance}
            decimals={decimals}
            symbol={symbol}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="glass rounded-3xl p-5 sm:p-6">
              <SectionHeading
                icon={Coins}
                title="Daily amount"
                description="The amount every eligible wallet can claim once per 24 hours."
              />
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    value={amountValue}
                    onChange={(event) => setAmountInput(event.target.value)}
                    inputMode="decimal"
                    className="input pr-16"
                    aria-label="Daily claim amount"
                    placeholder="100"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] text-paper-mute">
                    {symbol}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={updateDailyAmount}
                  disabled={busy}
                  className="btn-primary h-12 shrink-0 px-5 text-xs"
                >
                  {pending === "Update daily amount" && busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Update amount
                </button>
              </div>
              <p className="mt-3 font-mono text-[10px] text-paper-mute">
                Current: {formatAmount(dailyAmount, decimals, 4)} {symbol}
              </p>
            </section>

            <section className="glass rounded-3xl p-5 sm:p-6">
              <SectionHeading
                icon={paused ? Play : Pause}
                title={paused ? "Claims are paused" : "Claims are live"}
                description="Pausing blocks new claims. Existing balances and history stay intact."
              />
              <button
                type="button"
                onClick={togglePause}
                disabled={busy}
                className={cn(
                  "mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                  paused
                    ? "border-mint/30 bg-mint/10 text-mint hover:bg-mint/15"
                    : "border-danger/30 bg-danger/[0.07] text-danger hover:bg-danger/10",
                )}
              >
                {(pending === "Pause claims" || pending === "Unpause claims") &&
                busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : paused ? (
                  <Play className="size-4" />
                ) : (
                  <Pause className="size-4" />
                )}
                {paused ? "Unpause claims" : "Pause claims"}
              </button>
              <p className="mt-3 text-[10px] leading-5 text-paper-mute">
                {paused
                  ? "New claim transactions will revert until unpaused."
                  : "Use this if the signer is compromised or the faucet needs maintenance."}
              </p>
            </section>

            <section className="glass rounded-3xl p-5 sm:p-6">
              <SectionHeading
                icon={Wallet}
                title="Faucet"
                description="Withdraw tokens to a treasury wallet, or send ELYZ to the contract to refill it."
              />
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-paper-mute">
                    Balance
                  </span>
                  <span className="tabular font-mono text-xs text-paper">
                    {formatAmount(faucetBalance, decimals, 2)} {symbol}
                  </span>
                </div>
                <input
                  value={withdrawInput}
                  onChange={(event) => setWithdrawInput(event.target.value)}
                  inputMode="decimal"
                  className="input"
                  placeholder={`Amount in ${symbol}`}
                  aria-label="Withdraw amount"
                />
                <input
                  value={withdrawToValue}
                  onChange={(event) => setWithdrawTo(event.target.value)}
                  className="input"
                  placeholder="Recipient address"
                  aria-label="Withdraw recipient"
                />
                <button
                  type="button"
                  onClick={withdraw}
                  disabled={busy}
                  className="btn-ghost w-full"
                >
                  {pending === "Withdraw tokens" && busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ExternalLink className="size-3.5" />
                  )}
                  Withdraw tokens
                </button>
              </div>
            </section>

            <section className="glass rounded-3xl p-5 sm:p-6">
              <SectionHeading
                icon={ShieldCheck}
                title="Claim signer"
                description="The server signs EIP-712 authorizations with this address. It must match FAUCET_SIGNER_PRIVATE_KEY."
              />
              <div className="mt-5 space-y-3">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3.5 py-3 text-[10px]",
                    health.data?.signerMatches
                      ? "border-mint/20 bg-mint/[0.05] text-mint"
                      : "border-warn/20 bg-warn/[0.05] text-warn",
                  )}
                >
                  {health.data?.signerMatches ? (
                    <Check className="size-3.5" />
                  ) : (
                    <AlertTriangle className="size-3.5" />
                  )}
                  {health.data?.signerMatches
                    ? "Server signer matches the contract."
                    : health.data?.message ??
                      "Signer status unavailable. Check the server environment."}
                </div>
                <input
                  value={signerValue}
                  onChange={(event) => setSignerInput(event.target.value)}
                  className="input"
                  placeholder="Signer address"
                  aria-label="Claim signer address"
                />
                <button
                  type="button"
                  onClick={updateSigner}
                  disabled={busy}
                  className="btn-ghost w-full"
                >
                  {pending === "Rotate signer" && busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Settings2 className="size-3.5" />
                  )}
                  Rotate signer
                </button>
              </div>
            </section>
          </div>

          <section className="glass rounded-3xl p-5 sm:p-6">
            <SectionHeading
              icon={Settings2}
              title="Contracts"
              description="Addresses used by this deployment."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <AddressRow
                label="Claim contract"
                value={CLAIM_ADDRESS}
                href={explorerAddress(CLAIM_ADDRESS)}
                onCopy={() => copy(CLAIM_ADDRESS, "Claim address")}
              />
              <AddressRow
                label="Token"
                value={TOKEN_ADDRESS}
                href={explorerAddress(TOKEN_ADDRESS)}
                onCopy={() => copy(TOKEN_ADDRESS, "Token address")}
              />
              <AddressRow
                label="Owner"
                value={owner ?? "—"}
                href={owner ? explorerAddress(owner) : undefined}
                onCopy={owner ? () => copy(owner, "Owner address") : undefined}
              />
              <AddressRow
                label="Signer"
                value={signer ?? "—"}
                href={signer ? explorerAddress(signer) : undefined}
                onCopy={signer ? () => copy(signer, "Signer address") : undefined}
              />
            </div>
          </section>

          {hash && !settled ? (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand/20 bg-brand/[0.05] px-4 py-3 text-[10px] text-brand">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                Waiting for transaction confirmation…
              </span>
              <a
                href={explorerTx(hash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold"
              >
                Explorer <ArrowUpRight className="size-3" />
              </a>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ReadOnlyStats({
  totalClaimed,
  totalClaims,
  uniqueClaimers,
  faucetBalance,
  decimals,
  symbol,
}: {
  totalClaimed?: bigint;
  totalClaims?: bigint;
  uniqueClaimers?: bigint;
  faucetBalance?: bigint;
  decimals: number;
  symbol: string;
}) {
  const stats = [
    {
      label: "Total claimed",
      value: `${formatAmount(totalClaimed, decimals, 2)} ${symbol}`,
    },
    {
      label: "Claims",
      value: totalClaims !== undefined ? totalClaims.toString() : "—",
    },
    {
      label: "Unique wallets",
      value: uniqueClaimers !== undefined ? uniqueClaimers.toString() : "—",
    },
    {
      label: "Faucet balance",
      value: `${formatAmount(faucetBalance, decimals, 2)} ${symbol}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-paper/[0.08] bg-paper/[0.07] lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-ink/85 p-4 sm:p-5">
          <p className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
            {stat.label}
          </p>
          <p className="tabular mt-2 font-mono text-lg text-paper">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-paper/[0.08] bg-paper/[0.03] text-brand">
        <Icon className="size-4" />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-paper">{title}</h2>
        <p className="mt-1 text-[11px] leading-5 text-paper-mute">
          {description}
        </p>
      </div>
    </div>
  );
}

function AddressRow({
  label,
  value,
  href,
  onCopy,
}: {
  label: string;
  value: string;
  href?: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
          {label}
        </p>
        <p className="mt-1 truncate font-mono text-[11px] text-paper">
          {value === "—" ? value : shortAddress(value, 6)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="flex size-7 items-center justify-center rounded-full text-paper-mute transition hover:bg-paper/[0.05] hover:text-paper"
            aria-label={`Copy ${label}`}
          >
            <Copy className="size-3" />
          </button>
        ) : null}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex size-7 items-center justify-center rounded-full text-paper-mute transition hover:bg-paper/[0.05] hover:text-brand"
            aria-label={`Open ${label} in explorer`}
          >
            <ArrowUpRight className="size-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Notice({
  tone,
  title,
  body,
}: {
  tone: "warn" | "danger";
  title: string;
  body: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4",
        tone === "warn"
          ? "border-warn/20 bg-warn/[0.05] text-warn"
          : "border-danger/20 bg-danger/[0.05] text-danger",
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="mt-1 text-[11px] leading-5 opacity-80">{body}</p>
      </div>
    </div>
  );
}
