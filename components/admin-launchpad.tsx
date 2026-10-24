"use client";

import Link from "next/link";
import { useState, type ComponentType, type ReactNode } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Save,
  ScanSearch,
  Settings2,
  ShieldCheck,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  BaseError,
  formatUnits,
  isAddress,
  type Address,
} from "viem";
import { useAccount, useSignMessage } from "wagmi";
import { buildAdminMessage } from "@/lib/launchpad/auth-message";
import {
  LAUNCHPAD_CONFIG_QUERY_KEY,
} from "@/hooks/use-launchpad-config";
import { hashLaunchpadPayload } from "@/lib/launchpad/stable";
import {
  MINT_METHODS,
  type ContractInspection,
  type LaunchpadAdminAction,
  type LaunchpadAdminStatus,
  type LaunchpadConfig,
} from "@/lib/launchpad/types";
import { explorerAddress } from "@/lib/config";
import {
  ELYSIUM_CHAINS,
  getChainRpcUrl,
  getDefaultChainId,
  getElysiumChain,
  type ElysiumChainId,
} from "@/lib/chains";
import { formatAmount, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

type AdminResponse = {
  config: LaunchpadConfig;
  admin: LaunchpadAdminStatus;
};

type SignedRequest = {
  address: Address;
  timestamp: number;
  signature: string;
  payload: unknown;
};

function txError(error: unknown) {
  if (error instanceof BaseError) return error.shortMessage;
  if (error instanceof Error) return error.message.split("\n")[0];
  return "The request could not be completed.";
}

function formatUnix(seconds: number) {
  if (!seconds) return "not set";
  return new Date(seconds * 1000).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function responseError(response: Response) {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? `Request failed with HTTP ${response.status}.`;
  } catch {
    return `Request failed with HTTP ${response.status}.`;
  }
}

export function AdminLaunchpad() {
  const { address } = useAccount();

  return (
    <div className="section-shell pb-20 pt-10 sm:pt-14">
      <PageHeader />

      {!address ? (
        <div className="mt-8">
          <ConnectCard />
        </div>
      ) : (
        <AdminLaunchpadForm key={address} address={address} />
      )}
    </div>
  );
}

function PageHeader() {
  return (
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
          Launchpad settings
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-paper-mute">
          Configure the collection, network RPC, mint method, price, and limits.
          Every save is a signed message — no gas and no contract transaction.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/collection"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-brand/25 bg-brand/[0.06] px-3 font-mono text-[9px] uppercase tracking-[0.16em] text-brand transition hover:bg-brand/10"
        >
          <Settings2 className="size-3" />
          Collection
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/[0.06] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-brand">
          <ShieldCheck className="size-3" />
          Signed saves
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-paper/10 bg-paper/[0.03] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
          {getElysiumChain(getDefaultChainId()).name} ·{" "}
          {getDefaultChainId()}
        </span>
      </div>
    </div>
  );
}

function ConnectCard() {
  const { openConnectModal } = useConnectModal();

  return (
    <div className="glass flex flex-col items-start gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Wallet className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-paper">
            Connect an admin wallet
          </p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-paper-mute">
            Admin access is granted to the current collection owner or the claim
            contract owner.
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
  );
}

function AdminLaunchpadForm({ address }: { address: Address }) {
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();

  const adminKey = ["launchpad-admin", address.toLowerCase()] as const;
  const adminQuery = useQuery<AdminResponse>({
    queryKey: adminKey,
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/launchpad?address=${address}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(await responseError(response));
      return (await response.json()) as AdminResponse;
    },
    staleTime: 60_000,
    retry: 1,
  });

  const [draft, setDraft] = useState<LaunchpadConfig | null>(null);
  const [inspection, setInspection] = useState<ContractInspection | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = draft ?? adminQuery.data?.config ?? null;
  const admin = adminQuery.data?.admin;

  function update<K extends keyof LaunchpadConfig>(
    key: K,
    value: LaunchpadConfig[K],
  ) {
    setDraft((current) => {
      const base = current ?? adminQuery.data?.config;
      if (!base) return current;
      return { ...base, [key]: value };
    });
  }

  async function signRequest(
    action: LaunchpadAdminAction,
    payload: unknown,
  ): Promise<SignedRequest> {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = buildAdminMessage({
      action,
      address,
      timestamp,
      payloadHash: hashLaunchpadPayload(payload),
    });
    const signature = await signMessageAsync({ message });

    return { address, timestamp, signature, payload };
  }

  async function inspect() {
    if (!form || inspecting) return;
    setInspecting(true);

    try {
      const payload = {
        chainId: form.chainId,
        rpcUrl: form.rpcUrl.trim(),
        collectionAddress: form.collectionAddress.trim(),
        seaDropAddress: form.seaDropAddress.trim(),
        feeRecipient: form.feeRecipient.trim(),
      };
      const signed = await signRequest("inspect-contract", payload);
      const response = await fetch("/api/admin/launchpad/inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(signed),
      });

      if (!response.ok) throw new Error(await responseError(response));

      const data = (await response.json()) as {
        inspection: ContractInspection;
      };
      setInspection(data.inspection);

      if (data.inspection.ok) {
        toast.success("Contract inspected", {
          description:
            data.inspection.detectedMethod
              ? `Detected ${data.inspection.detectedMethod}.`
              : "The RPC is reachable, but no common mint function was found.",
        });
      } else {
        toast.error("Inspection incomplete", {
          description:
            data.inspection.message ?? "The contract could not be read.",
        });
      }
    } catch (error) {
      toast.error("Inspection failed", { description: txError(error) });
    } finally {
      setInspecting(false);
    }
  }

  async function save() {
    if (!form || saving) return;
    setSaving(true);

    try {
      const signed = await signRequest("update-launchpad", form);
      const response = await fetch("/api/admin/launchpad", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(signed),
      });

      if (!response.ok) throw new Error(await responseError(response));

      const data = (await response.json()) as { config: LaunchpadConfig };
      queryClient.setQueryData<AdminResponse>(adminKey, (current) =>
        current ? { ...current, config: data.config } : current,
      );
      setDraft(null);
      void queryClient.invalidateQueries({
        queryKey: LAUNCHPAD_CONFIG_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "launchpad-contract",
      });
      void adminQuery.refetch();

      toast.success("Launchpad settings saved", {
        description:
          "The public launchpad picks up the new settings on its next refresh.",
      });
    } catch (error) {
      toast.error("Could not save settings", {
        description: txError(error),
      });
    } finally {
      setSaving(false);
    }
  }

  function applyInspection() {
    if (!inspection || !form || !inspection.ok) return;

    if (
      inspection.collectionAddress &&
      form.collectionAddress.trim() &&
      inspection.collectionAddress.toLowerCase() !==
        form.collectionAddress.trim().toLowerCase()
    ) {
      toast.error("Inspection is out of date", {
        description: "Inspect the current collection address before applying.",
      });
      return;
    }

    const next: LaunchpadConfig = {
      ...form,
      collectionAddress:
        inspection.collectionAddress || form.collectionAddress,
    };

    if (inspection.detectedMethod) {
      next.mintMethod = inspection.detectedMethod;
    }

    if (inspection.maxSupply) {
      const value = Number(inspection.maxSupply);
      if (Number.isSafeInteger(value) && value > 0 && value <= 100_000_000) {
        next.maxSupply = value;
      }
    }

    if (inspection.seaDrop) {
      next.seaDropAddress = inspection.seaDrop.address;
      if (inspection.seaDrop.feeRecipient) {
        next.feeRecipient = inspection.seaDrop.feeRecipient;
      }
      if (inspection.seaDrop.maxPerWallet > 0) {
        next.maxPerWallet = Math.min(5000, inspection.seaDrop.maxPerWallet);
      }
      try {
        next.mintPrice = formatUnits(
          BigInt(inspection.seaDrop.mintPrice),
          18,
        );
      } catch {
        // Keep the current price if the drop value is malformed.
      }
    }

    // The Elyziuma contract holds its own price and limits, so mirror them.
    if (inspection.elyziumaDrop) {
      if (inspection.elyziumaDrop.maxPerWallet > 0) {
        next.maxPerWallet = Math.min(
          5000,
          inspection.elyziumaDrop.maxPerWallet,
        );
      }
      try {
        next.mintPrice = formatUnits(
          BigInt(inspection.elyziumaDrop.publicPrice),
          18,
        );
      } catch {
        // Keep the current price if the contract value is malformed.
      }
    }

    setDraft(next);
    toast.success("Detected values applied", {
      description: "Review the form, then sign once to save.",
    });
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  if (adminQuery.isPending) {
    return <AdminSkeleton />;
  }

  if (adminQuery.isError) {
    return (
      <div className="mt-8 space-y-4">
        <Notice
          tone="danger"
          title="Could not load admin settings"
          body={adminQuery.error.message}
        />
        <button
          type="button"
          onClick={() => void adminQuery.refetch()}
          className="btn-ghost px-5"
        >
          <RefreshCw className="size-3.5" />
          Try again
        </button>
      </div>
    );
  }

  if (!admin?.authorized) {
    return (
      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4">
          <Notice
            tone="warn"
            title="This wallet is not a launchpad admin"
            body="Connect the collection owner wallet or the claim contract owner. Admin access is granted on-chain, so there is no extra list to configure."
          />

          <div className="glass rounded-3xl p-5 sm:p-6">
            <SectionHeading
              icon={LockKeyhole}
              title="How authorization works"
              description="At least one of these checks must match the connected wallet."
            />
            <ul className="mt-5 space-y-2.5">
              {[
                {
                  title: "Collection owner",
                  body: "The wallet that owns the configured collection contract can always manage the launchpad.",
                },
                {
                  title: "Claim owner",
                  body: "The owner of the daily claim contract is treated as a trusted fallback admin.",
                },
              ].map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl border border-paper/[0.07] bg-ink/40 p-3.5"
                >
                  <p className="text-[11px] font-semibold text-paper">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-paper-mute">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ReadOnlySummary
          address={address}
          config={adminQuery.data?.config}
          admin={admin}
          onCopy={copy}
        />
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-mint/20 bg-mint/[0.05] p-4 text-mint sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-xs font-semibold">Admin access confirmed</p>
            <p className="mt-1 text-[10px] leading-5 text-mint/80">
              Authorized by {formatSources(admin.sources)}. Saves are signed by{" "}
              {shortAddress(address, 5)}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void inspect()}
            disabled={inspecting || saving}
            className="btn-ghost h-10 border-mint/25 bg-mint/[0.05] px-4 text-[11px] text-mint"
          >
            {inspecting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ScanSearch className="size-3.5" />
            )}
            Inspect contract
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || inspecting}
            className="btn-primary h-10 px-5 text-[11px]"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save settings
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-3xl p-5 sm:p-6">
          <SectionHeading
            icon={Zap}
            title="Mint controls"
            description="The public page reads these values. On-chain limits still apply."
          />

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-paper/[0.07] bg-ink/40 p-3.5">
              <div>
                <p className="text-[11px] font-semibold text-paper">
                  Launchpad enabled
                </p>
                <p className="mt-1 text-[10px] leading-5 text-paper-mute">
                  Turn off to show a paused state without changing the contract.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.enabled}
                aria-label="Enable launchpad"
                onClick={() => update("enabled", !form.enabled)}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full border transition",
                  form.enabled
                    ? "border-mint/40 bg-mint/20"
                    : "border-paper/15 bg-paper/10",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1/2 size-5 -translate-y-1/2 rounded-full transition-all",
                    form.enabled
                      ? "left-6 bg-mint"
                      : "left-1 bg-paper-mute",
                  )}
                />
              </button>
            </div>

            <Field
              label="Collection contract"
              hint="The already-deployed NFT collection on Elysium. Paste the contract address, then inspect it."
            >
              <input
                value={form.collectionAddress}
                onChange={(event) =>
                  update("collectionAddress", event.target.value)
                }
                className="input"
                placeholder="0x…"
                spellCheck={false}
              />
              <AddressHint value={form.collectionAddress} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Max per wallet">
                <input
                  value={form.maxPerWallet}
                  onChange={(event) =>
                    update("maxPerWallet", Number(event.target.value))
                  }
                  type="number"
                  min={1}
                  max={5000}
                  className="input"
                  inputMode="numeric"
                />
              </Field>
              <Field
                label="Max supply"
                hint="0 = read from contract or open edition."
              >
                <input
                  value={form.maxSupply}
                  onChange={(event) =>
                    update("maxSupply", Number(event.target.value))
                  }
                  type="number"
                  min={0}
                  max={100_000_000}
                  className="input"
                  inputMode="numeric"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Mint price"
                hint="HYPE per NFT. SeaDrop overrides this when detected."
              >
                <input
                  value={form.mintPrice}
                  onChange={(event) =>
                    update("mintPrice", event.target.value)
                  }
                  className="input"
                  inputMode="decimal"
                  placeholder="0"
                />
              </Field>
              <Field label="Mint method">
                <select
                  value={form.mintMethod}
                  onChange={(event) =>
                    update(
                      "mintMethod",
                      event.target.value as LaunchpadConfig["mintMethod"],
                    )
                  }
                  className="input"
                >
                  {MINT_METHODS.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="SeaDrop contract"
                hint="Blank = auto-detect the canonical SeaDrop."
              >
                <input
                  value={form.seaDropAddress}
                  onChange={(event) =>
                    update("seaDropAddress", event.target.value)
                  }
                  className="input"
                  placeholder="0x…"
                  spellCheck={false}
                />
                <AddressHint value={form.seaDropAddress} />
              </Field>
              <Field
                label="SeaDrop fee recipient"
                hint="Required when the drop restricts fee recipients."
              >
                <input
                  value={form.feeRecipient}
                  onChange={(event) =>
                    update("feeRecipient", event.target.value)
                  }
                  className="input"
                  placeholder="0x…"
                  spellCheck={false}
                />
                <AddressHint value={form.feeRecipient} />
              </Field>
            </div>
          </div>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-6">
          <SectionHeading
            icon={RefreshCw}
            title="Network"
            description={`The Elysium chain the launchpad targets. Switching it repoints the browser wallet and the server without a redeploy. The RPC must report chain ${form.chainId}.`}
          />
          <div className="mt-5 space-y-3">
            <Field
              label="Elysium network"
              hint="Applies to the public launchpad and to every read the server makes."
            >
              <select
                value={form.chainId}
                onChange={(event) => {
                  const chainId = Number(event.target.value) as ElysiumChainId;
                  update("chainId", chainId);
                  update("rpcUrl", getChainRpcUrl(chainId));
                }}
                className="input"
              >
                {Object.values(ELYSIUM_CHAINS).map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name} · {chain.id}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Elysium RPC URL"
              hint="Save only after testing. Elysium is pre-launch, so writes may need a transaction-capable RPC."
            >
              <input
                value={form.rpcUrl}
                onChange={(event) => update("rpcUrl", event.target.value)}
                className="input"
                placeholder={getChainRpcUrl(form.chainId)}
                spellCheck={false}
              />
            </Field>
            <button
              type="button"
              onClick={() => void inspect()}
              disabled={inspecting || saving}
              className="btn-ghost w-full"
            >
              {inspecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ScanSearch className="size-3.5" />
              )}
              Test RPC and inspect
            </button>
            <p className="text-[10px] leading-5 text-paper-mute">
              The test signs a short-lived message and checks the chain ID, block
              number, contract bytecode, and mint functions. It does not send a
              transaction.
            </p>
          </div>

          <div className="mt-6 border-t border-paper/[0.07] pt-5">
            <SectionHeading
              icon={ShieldCheck}
              title="Drop links"
              description="Optional. They appear on the public launchpad hero."
            />
            <div className="mt-4 space-y-3">
              <Field label="Cover image URL">
                <input
                  value={form.coverImage}
                  onChange={(event) =>
                    update("coverImage", event.target.value)
                  }
                  className="input"
                  placeholder="https://… or ipfs://…"
                  spellCheck={false}
                />
              </Field>
              <Field label="Website">
                <input
                  value={form.websiteUrl}
                  onChange={(event) =>
                    update("websiteUrl", event.target.value)
                  }
                  className="input"
                  placeholder="https://…"
                  spellCheck={false}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="X / Twitter">
                  <input
                    value={form.twitterUrl}
                    onChange={(event) =>
                      update("twitterUrl", event.target.value)
                    }
                    className="input"
                    placeholder="https://x.com/…"
                    spellCheck={false}
                  />
                </Field>
                <Field label="Discord">
                  <input
                    value={form.discordUrl}
                    onChange={(event) =>
                      update("discordUrl", event.target.value)
                    }
                    className="input"
                    placeholder="https://discord.gg/…"
                    spellCheck={false}
                  />
                </Field>
              </div>
            </div>
          </div>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-6 lg:col-span-2">
          <SectionHeading
            icon={ExternalLink}
            title="Drop content"
            description="Shown in the hero, the details panel, and metadata."
          />
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <Field label="Title">
              <input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                className="input"
                maxLength={80}
              />
            </Field>
            <Field label="Tagline">
              <input
                value={form.tagline}
                onChange={(event) => update("tagline", event.target.value)}
                className="input"
                maxLength={160}
              />
            </Field>
            <div className="lg:col-span-2">
              <Field
                label="Description"
                hint="Plain text. Up to 4,000 characters."
              >
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                  className="input"
                  style={{ height: 128, resize: "vertical" }}
                  maxLength={4000}
                />
              </Field>
            </div>
          </div>
        </section>
      </div>

      <InspectionPanel
        inspection={inspection}
        inspecting={inspecting}
        onInspect={() => void inspect()}
        onApply={applyInspection}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-paper/[0.07] bg-ink/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <LockKeyhole className="mt-0.5 size-4 shrink-0 text-brand" />
          <p className="max-w-2xl text-[10px] leading-5 text-paper-mute">
            Saving writes to <span className="font-mono">data/launchpad.json</span>{" "}
            (or <span className="font-mono">LAUNCHPAD_CONFIG_PATH</span>). The
            signature is valid for five minutes and cannot be replayed. Use a
            transaction-capable RPC before announcing the mint.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || inspecting}
          className="btn-primary h-11 shrink-0 px-6 text-xs"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save signed settings
        </button>
      </div>
    </div>
  );
}

function InspectionPanel({
  inspection,
  inspecting,
  onInspect,
  onApply,
}: {
  inspection: ContractInspection | null;
  inspecting: boolean;
  onInspect: () => void;
  onApply: () => void;
}) {
  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeading
          icon={ScanSearch}
          title="Contract inspection"
          description="Reads the collection through the configured RPC, resolves proxies, scans for mint selectors, and checks SeaDrop."
        />
        <div className="flex shrink-0 gap-2">
          {inspection?.ok ? (
            <button
              type="button"
              onClick={onApply}
              className="btn-ghost h-9 px-4 text-[10px]"
            >
              <Check className="size-3.5" />
              Apply detected
            </button>
          ) : null}
          <button
            type="button"
            onClick={onInspect}
            disabled={inspecting}
            className="btn-ghost h-9 px-4 text-[10px]"
          >
            {inspecting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {inspection ? "Re-inspect" : "Inspect"}
          </button>
        </div>
      </div>

      {!inspection ? (
        <p className="mt-5 rounded-xl border border-paper/[0.07] bg-ink/40 px-4 py-6 text-center text-[10px] leading-5 text-paper-mute">
          {inspecting
            ? "Reading the contract and SeaDrop…"
            : "Inspect the collection to verify the address, detect the standard and mint functions, and read the public drop."}
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-xl border px-3.5 py-3 text-[10px]",
              inspection.ok
                ? "border-mint/20 bg-mint/[0.05] text-mint"
                : "border-warn/20 bg-warn/[0.05] text-warn",
            )}
          >
            {inspection.ok ? (
              <Check className="size-3.5" />
            ) : (
              <AlertTriangle className="size-3.5" />
            )}
            <span className="font-semibold">
              {inspection.ok ? "Contract readable" : "Inspection issue"}
            </span>
            {inspection.chainId !== undefined ? (
              <span className="font-mono opacity-80">
                chain {inspection.chainId}
              </span>
            ) : null}
            {inspection.latencyMs !== undefined ? (
              <span className="font-mono opacity-80">
                {inspection.latencyMs} ms
              </span>
            ) : null}
            {inspection.blockNumber ? (
              <span className="font-mono opacity-80">
                block {inspection.blockNumber}
              </span>
            ) : null}
          </div>

          {inspection.message ? (
            <p className="text-[10px] leading-5 text-paper-mute">
              {inspection.message}
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <InspectFact label="Name" value={inspection.name ?? "—"} />
            <InspectFact label="Symbol" value={inspection.symbol ?? "—"} />
            <InspectFact
              label="Standard"
              value={
                inspection.standard === "ERC721"
                  ? "ERC-721"
                  : inspection.standard === "ERC1155"
                    ? "ERC-1155"
                    : "Unknown"
              }
            />
            <InspectFact
              label="Total supply"
              value={formatAmount(
                inspection.totalSupply ? BigInt(inspection.totalSupply) : undefined,
                0,
                0,
              )}
            />
            <InspectFact
              label="Max supply"
              value={formatAmount(
                inspection.maxSupply ? BigInt(inspection.maxSupply) : undefined,
                0,
                0,
              )}
            />
            <InspectFact
              label="Detected method"
              value={inspection.detectedMethod ?? "None"}
            />
            <InspectFact
              label="Owner"
              value={shortAddress(inspection.owner, 5)}
              href={
                inspection.owner ? explorerAddress(inspection.owner) : undefined
              }
            />
            <InspectFact
              label="Implementation"
              value={shortAddress(inspection.implementation, 5)}
              href={
                inspection.implementation
                  ? explorerAddress(inspection.implementation)
                  : undefined
              }
            />
            <InspectFact
              label="Collection"
              value={shortAddress(inspection.collectionAddress, 5)}
              href={
                inspection.collectionAddress
                  ? explorerAddress(inspection.collectionAddress)
                  : undefined
              }
            />
          </div>

          {inspection.methods.length > 0 ? (
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
                Mint selectors
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {inspection.methods.map((method) => (
                  <div
                    key={`${method.source}-${method.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 font-mono text-[10px]",
                      method.available
                        ? "border-mint/20 bg-mint/[0.04] text-mint"
                        : "border-paper/[0.07] bg-paper/[0.02] text-paper-mute",
                    )}
                  >
                    {method.available ? (
                      <Check className="size-3 shrink-0" />
                    ) : (
                      <X className="size-3 shrink-0" />
                    )}
                    <span className="truncate">{method.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {inspection.elyziumaDrop ? (
            <div className="rounded-2xl border border-brand/20 bg-brand/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
                  Elyziuma drop
                </p>
                <span className="font-mono text-[9px] text-brand/80">
                  {inspection.elyziumaDrop.publicMintOpen
                    ? "public open"
                    : "public closed"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <InspectFact
                  label="Public price"
                  value={`${formatAmount(
                    BigInt(inspection.elyziumaDrop.publicPrice),
                    18,
                    6,
                  )} HYPE`}
                />
                <InspectFact
                  label="Public limit"
                  value={String(inspection.elyziumaDrop.maxPerWallet)}
                />
              </div>
            </div>
          ) : null}

          {inspection.seaDrop ? (
            <div className="rounded-2xl border border-brand/20 bg-brand/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
                  SeaDrop public drop
                </p>
                <a
                  href={explorerAddress(inspection.seaDrop.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[9px] text-brand/80 transition hover:text-brand"
                >
                  {shortAddress(inspection.seaDrop.address, 5)}
                  <ArrowUpRight className="size-2.5" />
                </a>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <InspectFact
                  label="Price"
                  value={`${formatAmount(BigInt(inspection.seaDrop.mintPrice), 18, 6)} HYPE`}
                />
                <InspectFact
                  label="Per wallet"
                  value={String(inspection.seaDrop.maxPerWallet)}
                />
                <InspectFact
                  label="Fee"
                  value={`${(inspection.seaDrop.feeBps / 100).toFixed(2)}%`}
                />
                <InspectFact
                  label="Fee recipient"
                  value={shortAddress(inspection.seaDrop.feeRecipient, 5)}
                  href={
                    inspection.seaDrop.feeRecipient
                      ? explorerAddress(inspection.seaDrop.feeRecipient)
                      : undefined
                  }
                />
              </div>
              <p className="mt-2.5 font-mono text-[9px] leading-5 text-paper-mute">
                Start {formatUnix(inspection.seaDrop.startTime)} · End{" "}
                {formatUnix(inspection.seaDrop.endTime)} ·{" "}
                {inspection.seaDrop.restrictFeeRecipients
                  ? "fee recipients restricted"
                  : "open fee recipient"}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ReadOnlySummary({
  address,
  config,
  admin,
  onCopy,
}: {
  address: Address;
  config?: LaunchpadConfig;
  admin?: LaunchpadAdminStatus;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <SectionHeading
        icon={LockKeyhole}
        title="Current settings"
        description="Visible without authorization. Connect an admin wallet to edit."
      />
      <div className="mt-5 space-y-2">
        <SummaryRow label="Connected" value={shortAddress(address, 5)} />
        <SummaryRow
          label="Collection"
          value={shortAddress(config?.collectionAddress, 5)}
        />
        <SummaryRow label="RPC" value={config?.rpcUrl ?? "—"} />
        <SummaryRow
          label="Network"
          value={
            config
              ? `${getElysiumChain(config.chainId).name} · ${config.chainId}`
              : "—"
          }
        />
        <SummaryRow
          label="Max per wallet"
          value={config ? String(config.maxPerWallet) : "—"}
        />
        <SummaryRow
          label="Enabled"
          value={config?.enabled ? "Yes" : "No"}
        />
        <SummaryRow
          label="Collection owner"
          value={shortAddress(admin?.collectionOwner, 5)}
        />
        <SummaryRow
          label="Claim owner"
          value={shortAddress(admin?.claimOwner, 5)}
        />
      </div>
      {config?.collectionAddress ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onCopy(config.collectionAddress, "Collection address")}
            className="btn-ghost h-9 flex-1 px-3 text-[10px]"
          >
            <Copy className="size-3" />
            Copy contract
          </button>
          <a
            href={explorerAddress(config.collectionAddress)}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost h-9 flex-1 px-3 text-[10px]"
          >
            <ArrowUpRight className="size-3" />
            ElysScan
          </a>
        </div>
      ) : null}
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="mt-8 space-y-4">
      <div className="h-16 animate-pulse rounded-2xl bg-paper/[0.05]" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="glass h-72 animate-pulse rounded-3xl"
          />
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] uppercase tracking-[0.14em] text-paper-mute">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-[9px] leading-5 text-paper-mute/80">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function AddressHint({ value }: { value: string }) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isAddress(trimmed)) {
    return (
      <span className="mt-1.5 flex items-center gap-1 text-[9px] text-danger">
        <AlertTriangle className="size-3" />
        Not a valid EVM address.
      </span>
    );
  }

  return (
    <span className="mt-1.5 block font-mono text-[9px] text-paper-mute">
      {shortAddress(trimmed, 6)}
    </span>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
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
        <p className="mt-1 max-w-xl text-[11px] leading-5 text-paper-mute">
          {description}
        </p>
      </div>
    </div>
  );
}

function InspectFact({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-2.5">
      <p className="text-[8px] uppercase tracking-[0.14em] text-paper-mute">
        {label}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-paper transition hover:text-brand"
        >
          {value}
          <ArrowUpRight className="size-2.5" />
        </a>
      ) : (
        <p className="mt-1 truncate font-mono text-[10px] text-paper">
          {value}
        </p>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-paper/[0.06] py-2 last:border-0">
      <span className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
        {label}
      </span>
      <span className="max-w-[60%] truncate text-right font-mono text-[10px] text-paper-dim">
        {value}
      </span>
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

function formatSources(sources: LaunchpadAdminStatus["sources"]) {
  if (sources.length === 0) return "an on-chain owner";
  return sources
    .map((source) =>
      source === "collection-owner"
        ? "collection ownership"
        : "claim ownership",
    )
    .join(", ");
}
