"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Coins,
  ExternalLink,
  KeyRound,
  Loader2,
  Pause,
  Play,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatUnits,
  isAddress,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { claimAbi } from "@/lib/abis";
import {
  CLAIM_ADDRESS,
  CLAIM_CHAIN_ID,
  explorerAddress,
  explorerTx,
} from "@/lib/config";
import { getElysiumChain } from "@/lib/chains";
import { formatAmount, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClaimData, useHealth } from "./admin-data";
import {
  CardHeading,
  ConnectPrompt,
  MiniStat,
  Notice,
  Panel,
  SectionHeader,
  StatusPill,
  TxBar,
  type Tone,
} from "./admin-ui";
import { sameAddress, txError } from "./admin-utils";

export function ClaimSection({ address }: { address?: Address }) {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const claim = useClaimData();
  const health = useHealth();
  const refetchClaim = claim.refetch;

  const [hash, setHash] = useState<Hash>();
  const [pending, setPending] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState<string | null>(null);
  const [withdrawInput, setWithdrawInput] = useState("");
  const [withdrawTo, setWithdrawTo] = useState<string | null>(null);
  const [signerInput, setSignerInput] = useState<string | null>(null);

  const claimChain = getElysiumChain(CLAIM_CHAIN_ID);
  const onWrongChain = chainId !== undefined && chainId !== CLAIM_CHAIN_ID;
  const isOwner = sameAddress(address, claim.owner);

  const receipt = useWaitForTransactionReceipt({
    hash,
    chainId: CLAIM_CHAIN_ID,
    query: { enabled: Boolean(hash) },
  });

  const amountValue =
    amountInput ??
    (claim.dailyAmount !== undefined
      ? formatUnits(claim.dailyAmount, claim.decimals)
      : "");
  const withdrawToValue = withdrawTo ?? address ?? "";
  const signerValue = signerInput ?? claim.signer ?? "";
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
    void refetchClaim();
    void refetchHealth();
  }, [hash, receipt.isSuccess, refetchClaim, refetchHealth]);

  useEffect(() => {
    if (
      !hash ||
      !receipt.isError ||
      !receipt.error ||
      handledError.current === hash
    ) {
      return;
    }
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
      const parsed = parseUnits(amountValue, claim.decimals);
      if (parsed <= 0n) throw new Error("Amount must be greater than zero.");
      await run("Update daily amount", () =>
        writeContractAsync({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "setDailyAmount",
          args: [parsed],
          chainId: CLAIM_CHAIN_ID,
        }),
      );
    } catch (error) {
      toast.error("Invalid amount", { description: txError(error) });
    }
  }

  async function togglePause() {
    await run(claim.paused ? "Unpause claims" : "Pause claims", () =>
      writeContractAsync({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: claim.paused ? "unpause" : "pause",
        chainId: CLAIM_CHAIN_ID,
      }),
    );
  }

  async function withdraw() {
    try {
      if (!isAddress(withdrawToValue)) {
        throw new Error("Enter a valid recipient.");
      }
      const parsed = parseUnits(withdrawInput, claim.decimals);
      if (parsed <= 0n) throw new Error("Amount must be greater than zero.");
      await run("Withdraw tokens", () =>
        writeContractAsync({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "withdraw",
          args: [withdrawToValue, parsed],
          chainId: CLAIM_CHAIN_ID,
        }),
      );
    } catch (error) {
      toast.error("Invalid withdrawal", { description: txError(error) });
    }
  }

  async function updateSigner() {
    try {
      if (!isAddress(signerValue)) {
        throw new Error("Enter a valid signer address.");
      }
      await run("Rotate signer", () =>
        writeContractAsync({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "setSigner",
          args: [signerValue],
          chainId: CLAIM_CHAIN_ID,
        }),
      );
    } catch (error) {
      toast.error("Invalid signer", { description: txError(error) });
    }
  }

  async function switchToClaimChain() {
    try {
      await switchChainAsync({ chainId: CLAIM_CHAIN_ID });
    } catch (error) {
      toast.error("Could not switch network", { description: txError(error) });
    }
  }

  const accessLabel = !claim.configured
    ? "Not configured"
    : !address
      ? "Connect wallet"
      : onWrongChain
        ? "Wrong network"
        : isOwner
          ? "Owner"
          : "View only";

  const accessTone: Tone = !claim.configured
    ? "warn"
    : !address
      ? "muted"
      : onWrongChain
        ? "warn"
        : isOwner
          ? "mint"
          : "muted";

  return (
    <section id="claim" className="scroll-mt-[150px] lg:scroll-mt-24">
      <SectionHeader
        index="03"
        title="Claim & faucet"
        description="The daily ELYZ claim contract. Every action here is an on-chain transaction signed by the claim owner."
        status={<StatusPill tone={accessTone}>{accessLabel}</StatusPill>}
      />

      <div className="mt-5 space-y-4">
        {claim.configured ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat
              label="Daily amount"
              value={`${formatAmount(
                claim.dailyAmount,
                claim.decimals,
                4,
              )} ${claim.symbol}`}
            />
            <MiniStat
              label="Faucet"
              value={`${formatAmount(
                claim.faucetBalance,
                claim.decimals,
                2,
              )} ${claim.symbol}`}
              tone="mint"
            />
            <MiniStat
              label="Claims"
              value={claim.totalClaims?.toString() ?? "—"}
            />
            <MiniStat
              label="Unique wallets"
              value={claim.uniqueClaimers?.toString() ?? "—"}
            />
          </div>
        ) : null}

        {!claim.configured ? (
          <Notice
            tone="warn"
            title="Claim contracts are not configured"
            body={
              <>
                Set{" "}
                <span className="font-mono">NEXT_PUBLIC_CLAIM_ADDRESS</span> and{" "}
                <span className="font-mono">NEXT_PUBLIC_TOKEN_ADDRESS</span>,
                then restart the app. The launchpad and collection sections stay
                available.
              </>
            }
          />
        ) : !address ? (
          <ConnectPrompt
            title="Connect the claim owner wallet"
            body={`The console reads the owner address from the claim contract on ${claimChain.name} and checks it against the connected wallet.`}
          />
        ) : onWrongChain ? (
          <Notice
            tone="warn"
            title={`Switch to ${claimChain.name}`}
            body={`This wallet is on chain ${chainId}. The claim contracts live on chain ${CLAIM_CHAIN_ID}, so reads and writes need that network.`}
            action={
              <button
                type="button"
                onClick={() => void switchToClaimChain()}
                className="btn-primary h-10 px-4 text-[11px]"
              >
                Switch network
              </button>
            }
          />
        ) : !isOwner ? (
          <Notice
            tone="warn"
            title="This wallet is not the claim owner"
            body={`The owner is ${
              claim.owner ?? "not available"
            }. Connect the owner wallet to change settings.`}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <CardHeading
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
                    {claim.symbol}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void updateDailyAmount()}
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
                Current:{" "}
                {formatAmount(claim.dailyAmount, claim.decimals, 4)}{" "}
                {claim.symbol}
              </p>
            </Panel>

            <Panel>
              <CardHeading
                icon={claim.paused ? Play : Pause}
                title={claim.paused ? "Claims are paused" : "Claims are live"}
                description="Pausing blocks new claims. Existing balances and history stay intact."
              />
              <button
                type="button"
                onClick={() => void togglePause()}
                disabled={busy}
                className={cn(
                  "mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                  claim.paused
                    ? "border-mint/30 bg-mint/10 text-mint hover:bg-mint/15"
                    : "border-danger/30 bg-danger/[0.07] text-danger hover:bg-danger/10",
                )}
              >
                {(pending === "Pause claims" ||
                  pending === "Unpause claims") &&
                busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : claim.paused ? (
                  <Play className="size-4" />
                ) : (
                  <Pause className="size-4" />
                )}
                {claim.paused ? "Unpause claims" : "Pause claims"}
              </button>
              <p className="mt-3 text-[10px] leading-5 text-paper-mute">
                {claim.paused
                  ? "New claim transactions revert until the contract is unpaused."
                  : "Use this if the signer is compromised or the faucet needs maintenance."}
              </p>
            </Panel>

            <Panel>
              <CardHeading
                icon={Wallet}
                title="Faucet withdrawal"
                description="Send ELYZ to a treasury wallet. Refill the faucet by transferring ELYZ to the claim contract."
              />
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-paper-mute">
                    Balance
                  </span>
                  <span className="tabular font-mono text-xs text-paper">
                    {formatAmount(claim.faucetBalance, claim.decimals, 2)}{" "}
                    {claim.symbol}
                  </span>
                </div>
                <input
                  value={withdrawInput}
                  onChange={(event) => setWithdrawInput(event.target.value)}
                  inputMode="decimal"
                  className="input"
                  placeholder={`Amount in ${claim.symbol}`}
                  aria-label="Withdraw amount"
                />
                <input
                  value={withdrawToValue}
                  onChange={(event) => setWithdrawTo(event.target.value)}
                  className="input"
                  placeholder="Recipient address"
                  aria-label="Withdraw recipient"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => void withdraw()}
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
            </Panel>

            <Panel>
              <CardHeading
                icon={ShieldCheck}
                title="Claim signer"
                description="The server signs EIP-712 authorizations with this address. It must match FAUCET_SIGNER_PRIVATE_KEY."
              />
              <div className="mt-5 space-y-3">
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3.5 py-3 text-[10px]",
                    health.data?.signerMatches
                      ? "border-mint/20 bg-mint/[0.05] text-mint"
                      : "border-warn/20 bg-warn/[0.05] text-warn",
                  )}
                >
                  {health.data?.signerMatches ? (
                    <Check className="mt-0.5 size-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {health.data?.signerMatches
                        ? "Server signer matches the contract."
                        : "Signer needs attention."}
                    </p>
                    <p className="mt-1 leading-5 opacity-80">
                      {health.data?.signerMatches
                        ? "Claims can be signed by the server."
                        : health.data?.message ??
                          "Signer status unavailable. Check FAUCET_SIGNER_PRIVATE_KEY on the server."}
                    </p>
                  </div>
                </div>
                <input
                  value={signerValue}
                  onChange={(event) => setSignerInput(event.target.value)}
                  className="input"
                  placeholder="Signer address"
                  aria-label="Claim signer address"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => void updateSigner()}
                  disabled={busy}
                  className="btn-ghost w-full"
                >
                  {pending === "Rotate signer" && busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-3.5" />
                  )}
                  Rotate signer
                </button>
                <p className="text-[9px] leading-5 text-paper-mute">
                  Rotating the signer requires updating{" "}
                  <span className="font-mono">FAUCET_SIGNER_PRIVATE_KEY</span> on
                  the server. Claims fail until the two match again.
                </p>
              </div>
            </Panel>
          </div>
        )}

        {claim.configured ? (
          <Panel className="border-paper/[0.07] bg-paper/[0.02]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
                  Claim contract
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[10px] text-paper-dim">
                  <a
                    href={explorerAddress(CLAIM_ADDRESS)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 transition hover:text-brand"
                  >
                    {shortAddress(CLAIM_ADDRESS, 6)}
                    <ExternalLink className="size-3" />
                  </a>
                  <span className="text-paper-mute">
                    Owner {shortAddress(claim.owner, 5)}
                  </span>
                  <span className="text-paper-mute">
                    Signer {shortAddress(claim.signer, 5)}
                  </span>
                </div>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper-mute">
                {claimChain.name} · {CLAIM_CHAIN_ID}
              </span>
            </div>
          </Panel>
        ) : null}

        <TxBar
          hash={hash}
          settled={settled}
          href={hash ? explorerTx(hash) : undefined}
        />
      </div>
    </section>
  );
}
