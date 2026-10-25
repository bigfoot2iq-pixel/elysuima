"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Loader2,
  ShieldOff,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { isAddress, type Address, type Hash } from "viem";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { elyziumaNftAbi } from "@/lib/collection/abis";
import {
  collectionExplorerAddress,
  collectionExplorerTx,
} from "@/lib/collection/config";
import { shortAddress } from "@/lib/format";
import { useCollectionData } from "./admin-data";
import {
  CardHeading,
  ConnectPrompt,
  ConsoleSkeleton,
  Notice,
  Panel,
  SectionHeader,
  StatusPill,
  TxBar,
  type Tone,
} from "./admin-ui";
import { sameAddress, txError } from "./admin-utils";

export function OwnershipSection({ address }: { address?: Address }) {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const collection = useCollectionData({ poll: false });
  const refetchCollection = collection.refetch;

  const [hash, setHash] = useState<Hash>();
  const [pending, setPending] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [confirming, setConfirming] = useState<"transfer" | "renounce" | null>(
    null,
  );

  const onWrongChain =
    chainId !== undefined && chainId !== collection.activeChainId;
  const isOwner = sameAddress(address, collection.owner);

  function collectionAddress(): Address {
    if (!collection.collectionAddress) {
      throw new Error("The collection is not configured.");
    }
    return collection.collectionAddress;
  }

  const receipt = useWaitForTransactionReceipt({
    hash,
    chainId: collection.activeChainId,
    query: { enabled: Boolean(hash) },
  });

  const settled = Boolean(hash) && (receipt.isSuccess || receipt.isError);
  const busy = Boolean(pending) && !settled;
  const handledSuccess = useRef<Hash | undefined>(undefined);
  const handledError = useRef<Hash | undefined>(undefined);

  useEffect(() => {
    if (!hash || !receipt.isSuccess || handledSuccess.current === hash) return;
    handledSuccess.current = hash;
    setConfirming(null);
    toast.success("Transaction confirmed", {
      id: hash,
      description: "The collection ownership has been updated.",
    });
    void refetchCollection();
  }, [hash, receipt.isSuccess, refetchCollection]);

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
    setConfirming(null);
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

  async function transferOwnership() {
    try {
      if (!isAddress(transferTo)) {
        throw new Error("Enter a valid recipient address.");
      }
      await run("Transfer ownership", () =>
        writeContractAsync({
          address: collectionAddress(),
          abi: elyziumaNftAbi,
          functionName: "transferOwnership",
          args: [transferTo],
          chainId: collection.activeChainId,
        }),
      );
    } catch (error) {
      toast.error("Invalid transfer", { description: txError(error) });
    }
  }

  async function renounceOwnership() {
    await run("Renounce ownership", () =>
      writeContractAsync({
        address: collectionAddress(),
        abi: elyziumaNftAbi,
        functionName: "renounceOwnership",
        chainId: collection.activeChainId,
      }),
    );
  }

  async function switchToCollectionChain() {
    try {
      await switchChainAsync({ chainId: collection.activeChainId });
    } catch (error) {
      toast.error("Could not switch network", { description: txError(error) });
    }
  }

  const accessLabel = collection.launchpadQuery.isPending
    ? "Loading"
    : !collection.isConfigured
      ? "No collection"
      : !address
        ? "Connect wallet"
        : onWrongChain
          ? "Wrong network"
          : isOwner
            ? "Owner"
            : "View only";

  const accessTone: Tone = collection.launchpadQuery.isPending
    ? "muted"
    : !collection.isConfigured
      ? "warn"
      : !address
        ? "muted"
        : onWrongChain
          ? "warn"
          : isOwner
            ? "danger"
            : "muted";

  return (
    <section id="ownership" className="scroll-mt-[150px] lg:scroll-mt-24">
      <SectionHeader
        index="02"
        title="Ownership & danger zone"
        description="The last and most sensitive controls. These actions hand over or permanently give up control of the collection contract."
        status={<StatusPill tone={accessTone}>{accessLabel}</StatusPill>}
      />

      <div className="mt-5 space-y-4">
        {collection.launchpadQuery.isPending ? (
          <ConsoleSkeleton cards={2} />
        ) : !collection.isConfigured ? (
          <Notice
            tone="warn"
            title="The collection is not configured"
            body="Set the collection address in Network & launchpad before using ownership controls."
            action={
              <a href="#launchpad" className="btn-ghost h-10 px-4 text-[11px]">
                Open launchpad
              </a>
            }
          />
        ) : !address ? (
          <ConnectPrompt
            title="Connect the collection owner wallet"
            body={`Ownership controls are limited to the owner of the collection on ${collection.activeChain.name}.`}
          />
        ) : onWrongChain ? (
          <Notice
            tone="warn"
            title={`Switch to ${collection.activeChain.name}`}
            body={`This wallet is on chain ${chainId}. Ownership transactions must be sent on chain ${collection.activeChainId}.`}
            action={
              <button
                type="button"
                onClick={() => void switchToCollectionChain()}
                className="btn-primary h-10 px-4 text-[11px]"
              >
                Switch network
              </button>
            }
          />
        ) : !isOwner ? (
          <Notice
            tone="warn"
            title="This wallet is not the collection owner"
            body={`The owner is ${
              collection.owner ?? "not available"
            }. Connect the owner wallet to transfer or renounce ownership.`}
          />
        ) : (
          <>
            <Panel className="border-danger/15 bg-danger/[0.02]">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-danger/20 bg-danger/[0.06] text-danger">
                  <AlertTriangle className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-paper">
                    These actions are irreversible
                  </p>
                  <p className="mt-1 max-w-2xl text-[11px] leading-5 text-paper-mute">
                    Transferring hands every owner right to another wallet.
                    Renouncing gives them up forever. Neither can be undone from
                    this console.
                  </p>
                </div>
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <CardHeading
                  icon={ArrowRightLeft}
                  title="Transfer ownership"
                  description="Hand the collection to another wallet. The new owner can change price, metadata, and withdraw funds."
                />
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-paper-mute">
                      Current owner
                    </span>
                    <a
                      href={collectionExplorerAddress(
                        collection.owner ?? "",
                        collection.activeChainId,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[10px] text-paper-dim transition hover:text-brand"
                    >
                      {shortAddress(collection.owner, 6)}
                    </a>
                  </div>
                  <input
                    value={transferTo}
                    onChange={(event) => setTransferTo(event.target.value)}
                    className="input font-mono text-[11px]"
                    aria-label="New owner address"
                    placeholder="0x… new owner address"
                    spellCheck={false}
                  />
                  {confirming === "transfer" ? (
                    <button
                      type="button"
                      onClick={() => void transferOwnership()}
                      disabled={busy}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger/[0.07] text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pending === "Transfer ownership" && busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Confirm transfer to{" "}
                      {shortAddress(transferTo, 6)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming("transfer")}
                      disabled={busy || !isAddress(transferTo)}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-paper/15 bg-paper/[0.03] text-xs font-semibold text-paper transition hover:bg-paper/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowRightLeft className="size-3.5" />
                      Transfer ownership
                    </button>
                  )}
                  {confirming ? (
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="w-full text-center font-mono text-[9px] uppercase tracking-[0.16em] text-paper-mute transition hover:text-paper"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </Panel>

              <Panel className="border-danger/20">
                <CardHeading
                  icon={ShieldOff}
                  title="Renounce ownership"
                  description="Give up owner rights permanently. Every owner-only action stops working, including withdrawals."
                />
                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-danger/15 bg-danger/[0.04] px-3.5 py-3 text-[10px] leading-5 text-danger/80">
                    There is no recovery path. If you only want to hand over,
                    use transfer instead.
                  </div>
                  {confirming === "renounce" ? (
                    <button
                      type="button"
                      onClick={() => void renounceOwnership()}
                      disabled={busy}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger/[0.07] text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pending === "Renounce ownership" && busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Yes, renounce permanently
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming("renounce")}
                      disabled={busy}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-paper/15 bg-paper/[0.03] text-xs font-semibold text-paper-dim transition hover:border-danger/25 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ShieldOff className="size-3.5" />
                      Renounce ownership
                    </button>
                  )}
                  {confirming ? (
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="w-full text-center font-mono text-[9px] uppercase tracking-[0.16em] text-paper-mute transition hover:text-paper"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </Panel>
            </div>

            <Panel className="border-paper/[0.07] bg-paper/[0.02]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] text-paper-mute">
                  <Wallet className="size-3.5" />
                  Connected as{" "}
                  <span className="font-mono text-paper-dim">
                    {shortAddress(address, 6)}
                  </span>
                </div>
                <a
                  href={collectionExplorerAddress(
                    collection.collectionAddress ?? "",
                    collection.activeChainId,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper-mute transition hover:text-brand"
                >
                  Collection {shortAddress(collection.collectionAddress, 5)}
                </a>
              </div>
            </Panel>
          </>
        )}

        <TxBar
          hash={hash}
          settled={settled}
          href={
            hash
              ? collectionExplorerTx(hash, collection.activeChainId)
              : undefined
          }
        />
      </div>
    </section>
  );
}
