"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Coins,
  ImageIcon,
  Loader2,
  Pause,
  Play,
  Settings2,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
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
import { elyziumaNftAbi } from "@/lib/collection/abis";
import {
  collectionExplorerAddress,
  collectionExplorerTx,
} from "@/lib/collection/config";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCollectionData } from "./admin-data";
import { LaunchpadSchedulePanel } from "./launchpad-schedule-panel";
import { NetworkRuntimePanel } from "./network-runtime-panel";
import {
  AddressRow,
  CardHeading,
  ConnectPrompt,
  ConsoleSkeleton,
  KeyValueRow,
  MiniStat,
  Notice,
  Panel,
  SectionHeader,
  StatusPill,
  TxBar,
  type Tone,
} from "./admin-ui";
import {
  formatHype,
  NATIVE_DECIMALS,
  sameAddress,
  txError,
} from "./admin-utils";

export function CollectionSection({ address }: { address?: Address }) {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const collection = useCollectionData();
  const refetchCollection = collection.refetch;

  const [hash, setHash] = useState<Hash>();
  const [pending, setPending] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string | null>(null);
  const [baseUriInput, setBaseUriInput] = useState<string | null>(null);
  const [maxPerWalletInput, setMaxPerWalletInput] = useState<string | null>(
    null,
  );
  const [mintTo, setMintTo] = useState("");
  const [mintQuantity, setMintQuantity] = useState("1");
  const [withdrawTo, setWithdrawTo] = useState("");

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

  const priceValue =
    priceInput ??
    (collection.publicPrice !== undefined
      ? formatHype(collection.publicPrice)
      : "");
  const baseUriValue = baseUriInput ?? collection.baseUri ?? "";
  const maxPerWalletValue =
    maxPerWalletInput ?? collection.maxPerWallet?.toString() ?? "";
  const withdrawToValue = withdrawTo || address || "";
  const settled = Boolean(hash) && (receipt.isSuccess || receipt.isError);
  const busy = Boolean(pending) && !settled;
  const handledSuccess = useRef<Hash | undefined>(undefined);
  const handledError = useRef<Hash | undefined>(undefined);

  useEffect(() => {
    if (!hash || !receipt.isSuccess || handledSuccess.current === hash) return;
    handledSuccess.current = hash;
    toast.success("Transaction confirmed", {
      id: hash,
      description: "The collection has been updated.",
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

  async function updatePrice() {
    try {
      const trimmed = priceValue.trim();
      if (!/^\d+(\.\d{1,18})?$/.test(trimmed)) {
        throw new Error("Enter a HYPE amount with at most 18 decimals.");
      }
      const parsed = parseUnits(trimmed, NATIVE_DECIMALS);
      await run("Update price", () =>
        writeContractAsync({
          address: collectionAddress(),
          abi: elyziumaNftAbi,
          functionName: "setPublicPrice",
          args: [parsed],
          chainId: collection.activeChainId,
        }),
      );
    } catch (error) {
      toast.error("Invalid price", { description: txError(error) });
    }
  }

  async function toggleMintPhase() {
    await run(
      collection.publicMintOpen ? "Close public mint" : "Open public mint",
      () =>
        writeContractAsync({
          address: collectionAddress(),
          abi: elyziumaNftAbi,
          functionName: "setPublicMintOpen",
          args: [!collection.publicMintOpen],
          chainId: collection.activeChainId,
        }),
    );
  }

  async function updateMaxPerWallet() {
    try {
      const value = Number.parseInt(maxPerWalletValue, 10);
      if (!Number.isSafeInteger(value) || value < 1 || value > 5_000) {
        throw new Error("Enter a whole number between 1 and 5,000.");
      }
      await run("Update max per wallet", () =>
        writeContractAsync({
          address: collectionAddress(),
          abi: elyziumaNftAbi,
          functionName: "setMaxPerWallet",
          args: [BigInt(value)],
          chainId: collection.activeChainId,
        }),
      );
      setMaxPerWalletInput(null);
    } catch (error) {
      toast.error("Invalid max per wallet", { description: txError(error) });
    }
  }

  async function updateBaseUri() {
    try {
      const value = baseUriValue.trim();
      if (!value) throw new Error("Enter a base URI.");
      await run("Update base URI", () =>
        writeContractAsync({
          address: collectionAddress(),
          abi: elyziumaNftAbi,
          functionName: "setBaseURI",
          args: [value],
          chainId: collection.activeChainId,
        }),
      );
    } catch (error) {
      toast.error("Invalid base URI", { description: txError(error) });
    }
  }

  async function ownerMint() {
    try {
      if (!isAddress(mintTo)) {
        throw new Error("Enter a valid recipient address.");
      }
      const quantity = Number.parseInt(mintQuantity, 10);
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error("Quantity must be a whole number of at least 1.");
      }
      if (
        collection.maxSupply !== undefined &&
        collection.maxSupply > 0n &&
        collection.totalMinted !== undefined &&
        collection.totalMinted + BigInt(quantity) > collection.maxSupply
      ) {
        throw new Error("That would exceed the collection supply cap.");
      }
      await run("Owner mint", () =>
        writeContractAsync({
          address: collectionAddress(),
          abi: elyziumaNftAbi,
          functionName: "ownerMint",
          args: [mintTo, BigInt(quantity)],
          chainId: collection.activeChainId,
        }),
      );
    } catch (error) {
      toast.error("Invalid mint", { description: txError(error) });
    }
  }

  async function withdraw() {
    try {
      if (!isAddress(withdrawToValue)) {
        throw new Error("Enter a valid recipient address.");
      }
      await run("Withdraw", () =>
        writeContractAsync({
          address: collectionAddress(),
          abi: elyziumaNftAbi,
          functionName: "withdraw",
          args: [withdrawToValue],
          chainId: collection.activeChainId,
        }),
      );
    } catch (error) {
      toast.error("Invalid withdrawal", { description: txError(error) });
    }
  }

  async function switchToCollectionChain() {
    try {
      await switchChainAsync({ chainId: collection.activeChainId });
    } catch (error) {
      toast.error("Could not switch network", { description: txError(error) });
    }
  }

  const stats = [
    {
      label: "Minted",
      value:
        collection.totalMinted !== undefined &&
        collection.maxSupply !== undefined
          ? `${collection.totalMinted.toString()} / ${collection.maxSupply.toString()}`
          : "—",
    },
    {
      label: "Circulating",
      value: collection.totalSupply?.toString() ?? "—",
    },
    {
      label: "Max / wallet",
      value: collection.maxPerWallet?.toString() ?? "—",
    },
    {
      label: "Treasury",
      value: `${formatAmount(collection.treasury?.value, NATIVE_DECIMALS, 4)} HYPE`,
    },
  ];

  const mintProgress =
    collection.maxSupply !== undefined &&
    collection.maxSupply > 0n &&
    collection.totalMinted !== undefined
      ? Math.min(
          100,
          (Number(collection.totalMinted) / Number(collection.maxSupply)) * 100,
        )
      : undefined;

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
            ? "mint"
            : "muted";

  return (
    <section id="collection" className="scroll-mt-[150px] lg:scroll-mt-24">
      <SectionHeader
        index="01"
        title="NFT Collection"
        description="The contract, its network, and the owner controls for phase, price, metadata, mints, and treasury. Every action below is a contract transaction signed by the owner."
        status={
          <>
            <StatusPill tone="muted">
              {collection.activeChain.name} · {collection.activeChainId}
            </StatusPill>
            <StatusPill tone={accessTone}>{accessLabel}</StatusPill>
          </>
        }
      />

      <div className="mt-5 space-y-4">
        <NetworkRuntimePanel address={address} />
        <LaunchpadSchedulePanel address={address} />
        {collection.launchpadQuery.isPending ? (
          <ConsoleSkeleton cards={4} />
        ) : !collection.isConfigured ? (
          <Notice
            tone="warn"
            title="The collection is not configured"
            body="Set the collection address in Network & launchpad. This section manages whichever collection the launchpad is pointed at."
            action={
              <a href="#launchpad" className="btn-ghost h-10 px-4 text-[11px]">
                <Settings2 className="size-3.5" />
                Open launchpad
              </a>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats.map((stat) => (
                <MiniStat
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                />
              ))}
            </div>
            <p className="text-[9px] leading-5 text-paper-mute">
              The max per wallet is owner-controlled on-chain. Changing it
              affects future public mints only; tokens already minted stay put.
            </p>

            {!address ? (
              <ConnectPrompt
                title="Connect the collection owner wallet"
                body={`The console reads the owner address from the collection on ${collection.activeChain.name} and checks it against the connected wallet.`}
              />
            ) : onWrongChain ? (
              <Notice
                tone="warn"
                title={`Switch to ${collection.activeChain.name}`}
                body={`This wallet is on chain ${chainId}. The collection lives on chain ${collection.activeChainId}, so reads and writes need that network.`}
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
                }. Connect the owner wallet to manage the collection.`}
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel>
                  <CardHeading
                    icon={collection.publicMintOpen ? Pause : Play}
                    title={
                      collection.publicMintOpen
                        ? "Public mint is open"
                        : "Public mint is closed"
                    }
                    description="Anyone can mint for the current price while the phase is open, up to the per-wallet cap."
                  />
                  <button
                    type="button"
                    onClick={() => void toggleMintPhase()}
                    disabled={busy}
                    className={cn(
                      "mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                      collection.publicMintOpen
                        ? "border-danger/30 bg-danger/[0.07] text-danger hover:bg-danger/10"
                        : "border-mint/30 bg-mint/10 text-mint hover:bg-mint/15",
                    )}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : collection.publicMintOpen ? (
                      <Pause className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    {collection.publicMintOpen
                      ? "Close public mint"
                      : "Open public mint"}
                  </button>
                  <p className="mt-3 text-[10px] leading-5 text-paper-mute">
                    {collection.publicMintOpen
                      ? "Closing the phase makes public mints revert. Owner mints keep working."
                      : "Opening the phase lets wallets mint for the price below."}
                  </p>
                </Panel>

                <Panel>
                  <CardHeading
                    icon={Users}
                    title="Max per wallet"
                    description="Owner-controlled cap for the public phase. Lowering it blocks further mints for wallets already at the new cap."
                  />
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <input
                        value={maxPerWalletValue}
                        onChange={(event) =>
                          setMaxPerWalletInput(event.target.value)
                        }
                        type="number"
                        min={1}
                        max={5_000}
                        inputMode="numeric"
                        className="input pr-16"
                        aria-label="Max NFTs per wallet"
                        placeholder="1"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] text-paper-mute">
                        NFTs
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void updateMaxPerWallet()}
                      disabled={busy}
                      className="btn-primary h-12 shrink-0 px-5 text-xs"
                    >
                      {pending === "Update max per wallet" && busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Update cap
                    </button>
                  </div>
                  <p className="mt-3 font-mono text-[10px] text-paper-mute">
                    Current: {collection.maxPerWallet?.toString() ?? "—"}
                  </p>
                  <p className="mt-1.5 text-[10px] leading-5 text-paper-mute">
                    Existing tokens are unaffected. If a wallet already minted
                    above a lower cap, it simply cannot mint more.
                  </p>
                </Panel>

                <Panel>
                  <CardHeading
                    icon={Coins}
                    title="Public price"
                    description="What each token costs during the public phase, in HYPE. This is the authoritative on-chain value."
                  />
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <input
                        value={priceValue}
                        onChange={(event) => setPriceInput(event.target.value)}
                        inputMode="decimal"
                        className="input pr-16"
                        aria-label="Public mint price"
                        placeholder="0"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] text-paper-mute">
                        HYPE
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void updatePrice()}
                      disabled={busy}
                      className="btn-primary h-12 shrink-0 px-5 text-xs"
                    >
                      {pending === "Update price" && busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Update price
                    </button>
                  </div>
                  <p className="mt-3 font-mono text-[10px] text-paper-mute">
                    Current: {collection.publicPrice?.toString() ?? "—"} wei
                  </p>
                </Panel>

                <Panel>
                  <CardHeading
                    icon={ImageIcon}
                    title="Base URI"
                    description="Token metadata resolves to {baseURI}{tokenId}.json."
                  />
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={baseUriValue}
                      onChange={(event) => setBaseUriInput(event.target.value)}
                      className="input flex-1 font-mono text-[11px]"
                      aria-label="Base URI"
                      placeholder="https://example.com/api/nft/"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => void updateBaseUri()}
                      disabled={busy}
                      className="btn-primary h-12 shrink-0 px-5 text-xs"
                    >
                      {pending === "Update base URI" && busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Update
                    </button>
                  </div>
                  <p className="mt-3 text-[10px] leading-5 text-paper-mute">
                    {baseUriValue.trim() &&
                    !baseUriValue.trim().endsWith("/") ? (
                      <span className="text-warn">
                        This should end with a slash, otherwise the token id is
                        appended to the last path segment.
                      </span>
                    ) : collection.baseUri ? (
                      "Currently serving per-token metadata from this URI."
                    ) : (
                      "No minted token yet, so the current base URI cannot be read."
                    )}
                  </p>
                </Panel>

                <Panel>
                  <CardHeading
                    icon={Sparkles}
                    title="Owner mint"
                    description="Mint straight to any address for free. Exempt from the per-wallet cap, still bound by the supply cap."
                  />
                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_7rem]">
                    <input
                      value={mintTo}
                      onChange={(event) => setMintTo(event.target.value)}
                      className="input font-mono text-[11px]"
                      aria-label="Mint recipient"
                      placeholder="0x… recipient address"
                      spellCheck={false}
                    />
                    <input
                      value={mintQuantity}
                      onChange={(event) => setMintQuantity(event.target.value)}
                      inputMode="numeric"
                      className="input font-mono text-[11px]"
                      aria-label="Mint quantity"
                      placeholder="1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void ownerMint()}
                    disabled={busy}
                    className="btn-primary mt-3 h-12 w-full text-xs"
                  >
                    {pending === "Owner mint" && busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Mint to address
                  </button>
                  {mintProgress !== undefined ? (
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-paper/[0.06]">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${mintProgress}%` }}
                        />
                      </div>
                      <p className="mt-2 font-mono text-[10px] text-paper-mute">
                        {collection.totalMinted?.toString() ?? "—"} minted of{" "}
                        {collection.maxSupply?.toString() ?? "—"}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 font-mono text-[10px] text-paper-mute">
                      Supply unknown
                    </p>
                  )}
                </Panel>

                <Panel>
                  <CardHeading
                    icon={Wallet}
                    title="Treasury"
                    description="Sweep the HYPE collected by public mints to a wallet."
                  />
                  <div className="mt-5 flex items-center justify-between rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-paper-mute">
                      Balance
                    </span>
                    <span className="tabular font-mono text-xs text-paper">
                      {formatAmount(collection.treasury?.value, NATIVE_DECIMALS, 6)} HYPE
                    </span>
                  </div>
                  <input
                    value={withdrawToValue}
                    onChange={(event) => setWithdrawTo(event.target.value)}
                    className="input mt-3 font-mono text-[11px]"
                    aria-label="Withdraw recipient"
                    placeholder="0x… recipient address"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => void withdraw()}
                    disabled={busy}
                    className="btn-primary mt-3 h-12 w-full text-xs"
                  >
                    {pending === "Withdraw" && busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Withdraw balance
                  </button>
                  <p className="mt-3 text-[10px] leading-5 text-paper-mute">
                    Sends the full contract balance to the recipient.
                  </p>
                </Panel>

                <Panel className="lg:col-span-2">
                  <CardHeading
                    icon={Check}
                    title="Collection readout"
                    description="The contract this console controls."
                  />
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <AddressRow
                      label="Collection"
                      value={collection.collectionAddress ?? "—"}
                      href={
                        collection.collectionAddress
                          ? collectionExplorerAddress(
                              collection.collectionAddress,
                              collection.activeChainId,
                            )
                          : undefined
                      }
                    />
                    <AddressRow
                      label="Owner"
                      value={collection.owner ?? "—"}
                      href={
                        collection.owner
                          ? collectionExplorerAddress(
                              collection.owner,
                              collection.activeChainId,
                            )
                          : undefined
                      }
                    />
                    <KeyValueRow
                      label="Name"
                      value={collection.name ?? "—"}
                    />
                    <KeyValueRow
                      label="Symbol"
                      value={collection.symbol ?? "—"}
                    />
                    <KeyValueRow
                      label="Max supply"
                      value={`${collection.maxSupply?.toString() ?? "—"} · immutable`}
                    />
                    <KeyValueRow
                      label="Max / wallet"
                      value={collection.maxPerWallet?.toString() ?? "—"}
                      tone="brand"
                    />
                    <KeyValueRow
                      label="Circulating"
                      value={collection.totalSupply?.toString() ?? "—"}
                    />
                    <a
                      href={
                        collection.baseUri
                          ? `${collection.baseUri}1.json`
                          : undefined
                      }
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-2.5",
                        collection.baseUri
                          ? "transition hover:border-brand/25"
                          : "pointer-events-none",
                      )}
                    >
                      <span className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
                        Base URI
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1 font-mono text-[10px] text-paper-dim">
                        <span className="truncate">
                          {collection.baseUri ?? "—"}
                        </span>
                        {collection.baseUri ? (
                          <ArrowUpRight className="size-2.5 shrink-0" />
                        ) : null}
                      </span>
                    </a>
                  </div>
                </Panel>
              </div>
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
          </>
        )}
      </div>
    </section>
  );
}
