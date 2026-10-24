"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useBalance,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Coins,
  Copy,
  ImageIcon,
  Loader2,
  LockKeyhole,
  Pause,
  Play,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  BaseError,
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import { elyziumaNftAbi } from "@/lib/collection/abis";
import {
  COLLECTION_CHAIN_ID,
  collectionExplorerAddress,
  collectionExplorerTx,
} from "@/lib/collection/config";
import { getElysiumChain } from "@/lib/chains";
import { useLaunchpadConfig } from "@/hooks/use-launchpad-config";
import { formatAmount, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Token used to read the current base URI. Token ids start at 1. */
const PROBE_TOKEN_ID = 1n;

const NATIVE_DECIMALS = 18;

function txError(error: unknown) {
  if (error instanceof BaseError) return error.shortMessage;
  if (error instanceof Error) return error.message.split("\n")[0];
  return "The transaction could not be submitted.";
}

/**
 * The contract appends `{tokenId}.json` to the base URI, so the base URI can
 * be recovered from any minted token's URI.
 */
function deriveBaseUri(uri: string | undefined) {
  if (!uri) return undefined;
  const suffix = `${PROBE_TOKEN_ID}.json`;
  return uri.endsWith(suffix) ? uri.slice(0, -suffix.length) : uri;
}

/** Formats wei as HYPE without trailing zeros in the fractional part. */
function formatHype(value: bigint) {
  const [whole, fraction = ""] = formatUnits(value, NATIVE_DECIMALS).split(".");
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function AdminCollection() {
  const { address, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const launchpad = useLaunchpadConfig();

  /**
   * The console follows the network the launchpad is pointed at, so switching
   * chains in the launchpad console moves this one too.
   */
  const activeChainId = launchpad.data?.chainId ?? COLLECTION_CHAIN_ID;
  const activeChain = getElysiumChain(activeChainId);

  /**
   * The collection is the one the launchpad is configured to mint, so there is
   * a single source of truth for it.
   */
  const collectionAddress =
    launchpad.data?.collectionAddress &&
    isAddress(launchpad.data.collectionAddress)
      ? getAddress(launchpad.data.collectionAddress)
      : undefined;
  const isConfigured = Boolean(collectionAddress);

  /**
   * The collection address for a write. The console only renders its forms
   * once a collection is configured, so this never throws in practice.
   */
  function collection(): Address {
    if (!collectionAddress) {
      throw new Error("The collection is not configured.");
    }
    return collectionAddress;
  }

  const [hash, setHash] = useState<Hash>();
  const [pending, setPending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const [priceInput, setPriceInput] = useState<string | null>(null);
  const [baseUriInput, setBaseUriInput] = useState<string | null>(null);
  const [mintTo, setMintTo] = useState("");
  const [mintQuantity, setMintQuantity] = useState("1");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [transferTo, setTransferTo] = useState("");

  const { data, refetch } = useReadContracts({
    contracts: [
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "owner",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "name",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "symbol",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "totalMinted",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "totalSupply",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "maxSupply",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "MAX_PER_WALLET",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "publicPrice",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "publicMintOpen",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "tokenURI",
        args: [PROBE_TOKEN_ID],
        chainId: activeChainId,
      },
    ],
    query: { enabled: isConfigured, refetchInterval: 20_000 },
    allowFailure: true,
  });

  const [
    ownerResult,
    nameResult,
    symbolResult,
    totalMintedResult,
    totalSupplyResult,
    maxSupplyResult,
    maxPerWalletResult,
    publicPriceResult,
    publicMintOpenResult,
    tokenUriResult,
  ] = data ?? [];

  const owner =
    ownerResult?.status === "success"
      ? (ownerResult.result as Address)
      : undefined;
  const collectionName =
    nameResult?.status === "success" ? (nameResult.result as string) : undefined;
  const symbol =
    symbolResult?.status === "success" ? (symbolResult.result as string) : undefined;
  const totalMinted =
    totalMintedResult?.status === "success"
      ? (totalMintedResult.result as bigint)
      : undefined;
  const totalSupply =
    totalSupplyResult?.status === "success"
      ? (totalSupplyResult.result as bigint)
      : undefined;
  const maxSupply =
    maxSupplyResult?.status === "success"
      ? (maxSupplyResult.result as bigint)
      : undefined;
  const maxPerWallet =
    maxPerWalletResult?.status === "success"
      ? (maxPerWalletResult.result as bigint)
      : undefined;
  const publicPrice =
    publicPriceResult?.status === "success"
      ? (publicPriceResult.result as bigint)
      : undefined;
  const publicMintOpen =
    publicMintOpenResult?.status === "success"
      ? (publicMintOpenResult.result as boolean)
      : false;
  const baseUri = deriveBaseUri(
    tokenUriResult?.status === "success"
      ? (tokenUriResult.result as string)
      : undefined,
  );

  const { data: treasury } = useBalance({
    address: collectionAddress,
    chainId: activeChainId,
    query: { enabled: isConfigured, refetchInterval: 20_000 },
  });

  const isOwner =
    Boolean(address) &&
    Boolean(owner) &&
    address!.toLowerCase() === owner!.toLowerCase();
  const onWrongChain = chainId !== undefined && chainId !== activeChainId;

  const receipt = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  const priceValue =
    priceInput ?? (publicPrice !== undefined ? formatHype(publicPrice) : "");
  const baseUriValue = baseUriInput ?? baseUri ?? "";
  const withdrawToValue = withdrawTo || (address ?? "");
  const transferToValue = transferTo;

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
    setConfirming(null);
    void refetch();
  }, [hash, receipt.isSuccess, refetch]);

  useEffect(() => {
    if (!hash || !receipt.isError || !receipt.error || handledError.current === hash)
      return;
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

  async function updatePrice() {
    try {
      const trimmed = priceValue.trim();
      if (!/^\d+(\.\d{1,18})?$/.test(trimmed)) {
        throw new Error("Enter a HYPE amount with at most 18 decimals.");
      }
      const parsed = parseUnits(trimmed, NATIVE_DECIMALS);
      await run("Update price", () =>
        writeContractAsync({
          address: collection(),
          abi: elyziumaNftAbi,
          functionName: "setPublicPrice",
          args: [parsed],
          chainId: activeChainId,
        }),
      );
    } catch (error) {
      toast.error("Invalid price", { description: txError(error) });
    }
  }

  async function toggleMintPhase() {
    await run(publicMintOpen ? "Close public mint" : "Open public mint", () =>
      writeContractAsync({
        address: collection(),
        abi: elyziumaNftAbi,
        functionName: "setPublicMintOpen",
        args: [!publicMintOpen],
        chainId: activeChainId,
      }),
    );
  }

  async function updateBaseUri() {
    try {
      const value = baseUriValue.trim();
      if (!value) throw new Error("Enter a base URI.");
      await run("Update base URI", () =>
        writeContractAsync({
          address: collection(),
          abi: elyziumaNftAbi,
          functionName: "setBaseURI",
          args: [value],
          chainId: activeChainId,
        }),
      );
    } catch (error) {
      toast.error("Invalid base URI", { description: txError(error) });
    }
  }

  async function ownerMint() {
    try {
      if (!isAddress(mintTo)) throw new Error("Enter a valid recipient address.");
      const quantity = Number.parseInt(mintQuantity, 10);
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error("Quantity must be a whole number of at least 1.");
      }
      if (totalMinted !== undefined && totalMinted + BigInt(quantity) > (maxSupply ?? 0n)) {
        throw new Error("That would exceed the collection supply cap.");
      }
      await run("Owner mint", () =>
        writeContractAsync({
          address: collection(),
          abi: elyziumaNftAbi,
          functionName: "ownerMint",
          args: [mintTo, BigInt(quantity)],
          chainId: activeChainId,
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
          address: collection(),
          abi: elyziumaNftAbi,
          functionName: "withdraw",
          args: [withdrawToValue],
          chainId: activeChainId,
        }),
      );
    } catch (error) {
      toast.error("Invalid withdrawal", { description: txError(error) });
    }
  }

  async function transferOwnership() {
    try {
      if (!isAddress(transferToValue)) {
        throw new Error("Enter a valid recipient address.");
      }
      await run("Transfer ownership", () =>
        writeContractAsync({
          address: collection(),
          abi: elyziumaNftAbi,
          functionName: "transferOwnership",
          args: [transferToValue],
          chainId: activeChainId,
        }),
      );
    } catch (error) {
      toast.error("Invalid transfer", { description: txError(error) });
    }
  }

  async function renounceOwnership() {
    await run("Renounce ownership", () =>
      writeContractAsync({
        address: collection(),
        abi: elyziumaNftAbi,
        functionName: "renounceOwnership",
        chainId: activeChainId,
      }),
    );
  }

  async function switchToCollectionChain() {
    try {
      await switchChainAsync({ chainId: activeChainId });
    } catch (error) {
      toast.error("Could not switch network", { description: txError(error) });
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

  if (!collectionAddress) {
    return (
      <div className="section-shell pb-24 pt-12">
        <Notice
          tone="warn"
          title="The collection is not configured"
          body="Set the collection address in the launchpad console at /admin/launchpad. This console manages the collection the launchpad is pointed at."
        />
      </div>
    );
  }

  const stats = [
    {
      label: "Minted",
      value: totalMinted !== undefined ? totalMinted.toString() : "—",
    },
    {
      label: "Supply cap",
      value: maxSupply !== undefined ? maxSupply.toString() : "—",
    },
    {
      label: "Per wallet",
      value: maxPerWallet !== undefined ? maxPerWallet.toString() : "—",
    },
    {
      label: "Public price",
      value:
        publicPrice !== undefined
          ? `${formatAmount(publicPrice, NATIVE_DECIMALS, 6)} HYPE`
          : "—",
    },
  ];

  return (
    <div className="section-shell pb-20 pt-10 sm:pt-14">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-mute transition hover:text-brand"
          >
            <ArrowLeft className="size-3" />
            Claim owner console
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-paper sm:text-4xl">
            Collection console
          </h1>
          <p className="mt-2 max-w-lg text-xs leading-6 text-paper-mute">
            Control the mint phase, the price, the metadata URI, and owner
            mints. Every action is a contract transaction.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/launchpad"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand/25 bg-brand/[0.06] px-3 font-mono text-[9px] uppercase tracking-[0.16em] text-brand transition hover:bg-brand/10"
          >
            <Settings2 className="size-3" />
            Launchpad
          </Link>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em]",
              publicMintOpen
                ? "border-mint/25 bg-mint/[0.06] text-mint"
                : "border-paper/10 bg-paper/[0.03] text-paper-dim",
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {publicMintOpen ? "Public mint open" : "Public mint closed"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-paper/10 bg-paper/[0.03] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
            <LockKeyhole className="size-3" />
            Owner only
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
        <span className="rounded-full border border-paper/10 bg-paper/[0.03] px-3 py-1.5">
          {activeChain.name} · {activeChainId}
        </span>
        <a
          href={collectionExplorerAddress(collectionAddress, activeChainId)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-paper/10 bg-paper/[0.03] px-3 py-1.5 transition hover:text-brand"
        >
          {shortAddress(collectionAddress, 6)}
          <ArrowUpRight className="size-3" />
        </a>
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
                  The console reads the owner address from the contract. Connect
                  a wallet to see if it has permission.
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
      ) : onWrongChain ? (
        <div className="mt-8 space-y-4">
          <Notice
            tone="warn"
            title={`Switch to ${activeChain.name}`}
            body={`This wallet is on chain ${chainId}. The collection lives on chain ${activeChainId}, so reads and writes need the right network.`}
          />
          <button
            type="button"
            onClick={switchToCollectionChain}
            className="btn-primary px-6"
          >
            Switch network
          </button>
          <Stats stats={stats} />
        </div>
      ) : !isOwner ? (
        <div className="mt-8 space-y-4">
          <Notice
            tone="warn"
            title="This wallet is not the owner"
            body={`The owner is ${owner ?? "not available"}. Connect the owner wallet to manage the collection.`}
          />
          <Stats stats={stats} />
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <Stats stats={stats} />

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="glass rounded-3xl p-5 sm:p-6">
              <SectionHeading
                icon={publicMintOpen ? Pause : Play}
                title={publicMintOpen ? "Public mint is open" : "Public mint is closed"}
                description="Anyone can mint for the current price while the phase is open, up to the per-wallet cap."
              />
              <button
                type="button"
                onClick={toggleMintPhase}
                disabled={busy}
                className={cn(
                  "mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                  publicMintOpen
                    ? "border-danger/30 bg-danger/[0.07] text-danger hover:bg-danger/10"
                    : "border-mint/30 bg-mint/10 text-mint hover:bg-mint/15",
                )}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : publicMintOpen ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
                {publicMintOpen ? "Close public mint" : "Open public mint"}
              </button>
              <p className="mt-3 text-[10px] leading-5 text-paper-mute">
                {publicMintOpen
                  ? "Closing the phase makes publicMint revert. Owner mints keep working."
                  : "Opening the phase lets wallets mint for the price below."}
              </p>
            </section>

            <section className="glass rounded-3xl p-5 sm:p-6">
              <SectionHeading
                icon={Coins}
                title="Public price"
                description="What each token costs during the public phase, in HYPE."
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
                  onClick={updatePrice}
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
                Current: {publicPrice !== undefined ? publicPrice.toString() : "—"} wei
              </p>
            </section>

            <section className="glass rounded-3xl p-5 sm:p-6">
              <SectionHeading
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
                  onClick={updateBaseUri}
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
                {baseUriValue.trim() && !baseUriValue.trim().endsWith("/") ? (
                  <span className="text-warn">
                    This must end with a slash, otherwise the token id is
                    appended to the last path segment.
                  </span>
                ) : baseUri ? (
                  "Currently serving per-token metadata from this URI."
                ) : (
                  "No minted token yet, so the current base URI cannot be read."
                )}
              </p>
            </section>

            <section className="glass rounded-3xl p-5 sm:p-6">
              <SectionHeading
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
                onClick={ownerMint}
                disabled={busy}
                className="btn-primary mt-3 h-12 w-full text-xs"
              >
                {pending === "Owner mint" && busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Mint to address
              </button>
              <p className="mt-3 font-mono text-[10px] text-paper-mute">
                {totalMinted !== undefined && maxSupply !== undefined
                  ? `${totalMinted.toString()} minted of ${maxSupply.toString()}`
                  : "Supply unknown"}
              </p>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="glass rounded-3xl p-5 sm:p-6">
              <SectionHeading
                icon={Wallet}
                title="Treasury"
                description="Sweep the HYPE collected by public mints to a wallet."
              />
              <div className="mt-5 flex items-center justify-between rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
                <span className="text-[10px] uppercase tracking-[0.14em] text-paper-mute">
                  Balance
                </span>
                <span className="tabular font-mono text-xs text-paper">
                  {treasury
                    ? `${formatAmount(treasury.value, NATIVE_DECIMALS, 6)} HYPE`
                    : "—"}
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
                onClick={withdraw}
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
            </section>

            <section className="glass rounded-3xl p-5 sm:p-6">
              <SectionHeading
                icon={ShieldCheck}
                title="Ownership"
                description="Hand the collection to another wallet, or give up owner rights permanently."
              />
              <div className="mt-5 space-y-3">
                <input
                  value={transferToValue}
                  onChange={(event) => setTransferTo(event.target.value)}
                  className="input font-mono text-[11px]"
                  aria-label="New owner address"
                  placeholder="0x… new owner address"
                  spellCheck={false}
                />
                {confirming === "transfer" ? (
                  <button
                    type="button"
                    onClick={transferOwnership}
                    disabled={busy}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger/[0.07] text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending === "Transfer ownership" && busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Confirm transfer to {shortAddress(transferToValue, 6)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming("transfer")}
                    disabled={busy || !isAddress(transferToValue)}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-paper/15 bg-paper/[0.03] text-xs font-semibold text-paper transition hover:bg-paper/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Transfer ownership
                  </button>
                )}
                {confirming === "renounce" ? (
                  <button
                    type="button"
                    onClick={renounceOwnership}
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
              <p className="mt-3 text-[10px] leading-5 text-paper-mute">
                Renouncing locks every owner action forever. Transfer instead if
                you only want to hand over.
              </p>
            </section>
          </div>

          <section className="glass rounded-3xl p-5 sm:p-6">
            <SectionHeading
              icon={Settings2}
              title="Collection"
              description="The contract this console controls."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <AddressRow
                label="Collection"
                value={collectionAddress ?? "—"}
                href={collectionExplorerAddress(collectionAddress, activeChainId)}
                onCopy={collectionAddress ? () => copy(collectionAddress, "Collection address") : undefined}
              />
              <AddressRow
                label="Owner"
                value={owner ?? "—"}
                href={owner ? collectionExplorerAddress(owner, activeChainId) : undefined}
                onCopy={owner ? () => copy(owner, "Owner address") : undefined}
              />
              <AddressRow
                label="Name"
                value={collectionName ?? "—"}
              />
              <AddressRow
                label="Symbol"
                value={symbol ?? "—"}
              />
              <AddressRow
                label="Circulating"
                value={totalSupply !== undefined ? totalSupply.toString() : "—"}
              />
              <AddressRow
                label="Base URI"
                value={baseUri ?? "—"}
                href={baseUri ? `${baseUri}1.json` : undefined}
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
                href={collectionExplorerTx(hash, activeChainId)}
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

function Stats({
  stats,
}: {
  stats: { label: string; value: string }[];
}) {
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
        <p className="mt-1 text-[11px] leading-5 text-paper-mute">{description}</p>
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
  const isAddressLike = value.startsWith("0x");

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
          {label}
        </p>
        <p className="mt-1 truncate font-mono text-[11px] text-paper">
          {value === "—" ? value : isAddressLike ? shortAddress(value, 6) : value}
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
