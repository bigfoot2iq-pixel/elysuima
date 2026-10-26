"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Coins,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Send,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  isAddress,
  parseEther,
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
  TOKEN_ADDRESS,
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
import { formatHype, sameAddress, txError } from "./admin-utils";

export function ClaimSection({ address }: { address?: Address }) {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const claim = useClaimData();
  const health = useHealth();
  const refetchClaim = claim.refetch;

  const [hash, setHash] = useState<Hash>();
  const [pending, setPending] = useState<string | null>(null);
  const [communityFeeInput, setCommunityFeeInput] = useState<string | null>(
    null,
  );
  const [feeRecipientInput, setFeeRecipientInput] = useState<string | null>(
    null,
  );
  const [surplusAmountInput, setSurplusAmountInput] = useState("");
  const [surplusTo, setSurplusTo] = useState<string | null>(null);

  const claimChain = getElysiumChain(CLAIM_CHAIN_ID);
  const onWrongChain = chainId !== undefined && chainId !== CLAIM_CHAIN_ID;
  const isOwner = sameAddress(address, claim.owner);

  const receipt = useWaitForTransactionReceipt({
    hash,
    chainId: CLAIM_CHAIN_ID,
    query: { enabled: Boolean(hash) },
  });

  const communityFeeValue =
    communityFeeInput ??
    (claim.communityClaimFee !== undefined
      ? formatHype(claim.communityClaimFee)
      : "");
  const feeRecipientValue = feeRecipientInput ?? claim.feeRecipient ?? "";
  const surplusToValue = surplusTo ?? address ?? "";
  const settled = Boolean(hash) && (receipt.isSuccess || receipt.isError);
  const busy = Boolean(pending) && !settled;
  const handledSuccess = useRef<Hash | undefined>(undefined);
  const handledError = useRef<Hash | undefined>(undefined);
  const refetchHealth = health.refetch;

  const outstanding =
    (claim.nftPoolRemaining ?? 0n) + (claim.communityPoolRemaining ?? 0n);
  const surplusAvailable =
    claim.tokenBalance !== undefined && claim.tokenBalance > outstanding
      ? claim.tokenBalance - outstanding
      : 0n;

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

  async function updateCommunityFee() {
    try {
      const parsed = parseEther(communityFeeValue);
      await run("Update community fee", () =>
        writeContractAsync({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "setCommunityClaimFee",
          args: [parsed],
          chainId: CLAIM_CHAIN_ID,
        }),
      );
    } catch (error) {
      toast.error("Invalid community fee", { description: txError(error) });
    }
  }

  async function updateFeeRecipient() {
    try {
      if (!isAddress(feeRecipientValue)) {
        throw new Error("Enter a valid fee recipient.");
      }
      await run("Update fee recipient", () =>
        writeContractAsync({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "setFeeRecipient",
          args: [feeRecipientValue],
          chainId: CLAIM_CHAIN_ID,
        }),
      );
    } catch (error) {
      toast.error("Invalid fee recipient", { description: txError(error) });
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

  async function withdrawFees() {
    await run("Withdraw fees", () =>
      writeContractAsync({
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "withdrawFees",
        chainId: CLAIM_CHAIN_ID,
      }),
    );
  }

  async function withdrawSurplus() {
    try {
      if (!isAddress(surplusToValue)) {
        throw new Error("Enter a valid recipient.");
      }
      const parsed = parseUnits(surplusAmountInput, claim.decimals);
      if (parsed <= 0n) throw new Error("Amount must be greater than zero.");
      if (parsed > surplusAvailable) {
        throw new Error("Amount exceeds the available token surplus.");
      }
      await run("Withdraw surplus", () =>
        writeContractAsync({
          address: CLAIM_ADDRESS,
          abi: claimAbi,
          functionName: "withdrawSurplus",
          args: [surplusToValue, parsed],
          chainId: CLAIM_CHAIN_ID,
        }),
      );
    } catch (error) {
      toast.error("Invalid withdrawal", { description: txError(error) });
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
        title="Claim & rewards"
        description="The two-pool ELYZ claim contract. NFT rewards pay 10,000 ELYZ per NFT; the community reward pays 1,000 ELYZ once per wallet. Every action here is an on-chain transaction signed by the claim owner."
        status={<StatusPill tone={accessTone}>{accessLabel}</StatusPill>}
      />

      <div className="mt-5 space-y-4">
        {claim.configured ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat
              label="NFT claimed"
              value={`${formatAmount(
                claim.nftClaimedTotal,
                claim.decimals,
                2,
              )} ${claim.symbol}`}
              tone="mint"
            />
            <MiniStat
              label="Community claimed"
              value={`${formatAmount(
                claim.communityClaimedTotal,
                claim.decimals,
                2,
              )} ${claim.symbol}`}
            />
            <MiniStat
              label="NFT pool left"
              value={`${formatAmount(
                claim.nftPoolRemaining,
                claim.decimals,
                2,
              )} ${claim.symbol}`}
            />
            <MiniStat
              label="Community pool left"
              value={`${formatAmount(
                claim.communityPoolRemaining,
                claim.decimals,
                2,
              )} ${claim.symbol}`}
              tone="warn"
            />
          </div>
        ) : null}

        {claim.configured && health.data?.funded === false ? (
          <Notice
            tone="danger"
            title="Claim pools are underfunded"
            body={`The contract holds ${formatAmount(
              claim.tokenBalance,
              claim.decimals,
              2,
            )} ${claim.symbol}, but ${formatAmount(
              outstanding,
              claim.decimals,
              2,
            )} ${claim.symbol} is still owed to unclaimed rewards. Refill the contract before users claim.`}
          />
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
                title="Community claim fee"
                description="HYPE charged for the one-time community claim. NFT holder claims are free apart from gas. Set the fee to 0 to make the community claim free."
              />
              <div className="mt-5">
                <label
                  htmlFor="community-claim-fee"
                  className="mb-1.5 block text-[9px] uppercase tracking-[0.14em] text-paper-mute"
                >
                  Community claim fee (HYPE)
                </label>
                <input
                  id="community-claim-fee"
                  value={communityFeeValue}
                  onChange={(event) =>
                    setCommunityFeeInput(event.target.value)
                  }
                  inputMode="decimal"
                  className="input"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => void updateCommunityFee()}
                  disabled={busy}
                  className="btn-ghost mt-2 w-full"
                >
                  {pending === "Update community fee" && busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Update community fee
                </button>
              </div>
              <p className="mt-3 font-mono text-[10px] text-paper-mute">
                Current:{" "}
                {claim.communityClaimFee !== undefined
                  ? formatHype(claim.communityClaimFee)
                  : "—"}{" "}
                HYPE community · NFT claims free
              </p>
            </Panel>

            <Panel>
              <CardHeading
                icon={Wallet}
                title="Fee recipient"
                description="Withdrawn community claim fees are sent to this address."
              />
              <div className="mt-5 space-y-3">
                <input
                  value={feeRecipientValue}
                  onChange={(event) => setFeeRecipientInput(event.target.value)}
                  className="input"
                  placeholder="Fee recipient address"
                  aria-label="Fee recipient address"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => void updateFeeRecipient()}
                  disabled={busy}
                  className="btn-ghost w-full"
                >
                  {pending === "Update fee recipient" && busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Update fee recipient
                </button>
                <p className="font-mono text-[10px] text-paper-mute">
                  Current: {shortAddress(claim.feeRecipient, 6)}
                </p>
              </div>
            </Panel>

            <Panel>
              <CardHeading
                icon={claim.paused ? Play : Pause}
                title={claim.paused ? "Claims are paused" : "Claims are live"}
                description="Pausing blocks new NFT and community claims. Existing balances and history stay intact."
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
                  : "Use this if the claim contract needs maintenance or a fee change."}
              </p>
            </Panel>

            <Panel>
              <CardHeading
                icon={Coins}
                title="Withdraw fees"
                description="Send the community claim fees accrued in the contract to the fee recipient."
              />
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-paper-mute">
                    Accrued
                  </span>
                  <span className="tabular font-mono text-xs text-paper">
                    {claim.accruedFees !== undefined
                      ? formatHype(claim.accruedFees)
                      : "—"}{" "}
                    HYPE
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void withdrawFees()}
                  disabled={busy || (claim.accruedFees ?? 0n) === 0n}
                  className="btn-ghost w-full"
                >
                  {pending === "Withdraw fees" && busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="size-3.5" />
                  )}
                  Withdraw fees
                </button>
                <p className="text-[9px] leading-5 text-paper-mute">
                  Recipient: {shortAddress(claim.feeRecipient, 6)}
                </p>
              </div>
            </Panel>

            <Panel className="lg:col-span-2">
              <CardHeading
                icon={Send}
                title="Withdraw token surplus"
                description="Only ELYZ above the outstanding NFT + community pools can be withdrawn. The reward pools themselves are locked in the contract."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
                  <p className="text-[8px] uppercase tracking-[0.16em] text-paper-mute">
                    Contract balance
                  </p>
                  <p className="tabular mt-1.5 font-mono text-xs text-paper">
                    {formatAmount(claim.tokenBalance, claim.decimals, 2)}{" "}
                    {claim.symbol}
                  </p>
                </div>
                <div className="rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
                  <p className="text-[8px] uppercase tracking-[0.16em] text-paper-mute">
                    Still owed
                  </p>
                  <p className="tabular mt-1.5 font-mono text-xs text-paper">
                    {formatAmount(outstanding, claim.decimals, 2)}{" "}
                    {claim.symbol}
                  </p>
                </div>
                <div className="rounded-xl border border-mint/20 bg-mint/[0.04] px-3.5 py-3">
                  <p className="text-[8px] uppercase tracking-[0.16em] text-mint/80">
                    Withdrawable surplus
                  </p>
                  <p className="tabular mt-1.5 font-mono text-xs text-mint">
                    {formatAmount(surplusAvailable, claim.decimals, 2)}{" "}
                    {claim.symbol}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={surplusAmountInput}
                  onChange={(event) =>
                    setSurplusAmountInput(event.target.value)
                  }
                  inputMode="decimal"
                  className="input flex-1"
                  placeholder={`Amount in ${claim.symbol}`}
                  aria-label="Surplus amount"
                />
                <input
                  value={surplusToValue}
                  onChange={(event) => setSurplusTo(event.target.value)}
                  className="input flex-1"
                  placeholder="Recipient address"
                  aria-label="Surplus recipient"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => void withdrawSurplus()}
                  disabled={busy || surplusAvailable === 0n}
                  className="btn-ghost shrink-0"
                >
                  {pending === "Withdraw surplus" && busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Withdraw
                </button>
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
                    NFT {shortAddress(claim.nftAddress, 5)}
                  </span>
                  <a
                    href={explorerAddress(TOKEN_ADDRESS)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-paper-mute transition hover:text-brand"
                  >
                    Token {shortAddress(TOKEN_ADDRESS, 5)}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper-mute">
                {claimChain.name} · {CLAIM_CHAIN_ID}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-paper-mute">
              <span className="inline-flex items-center gap-1 rounded-full border border-paper/[0.08] px-2.5 py-1">
                <ShieldCheck className="size-3 text-mint" />
                NFT pool locked
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-paper/[0.08] px-2.5 py-1">
                <ShieldCheck className="size-3 text-mint" />
                Community pool locked
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-paper/[0.08] px-2.5 py-1">
                <AlertTriangle className="size-3 text-warn" />
                Threshold is UI-only
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
