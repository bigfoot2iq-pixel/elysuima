"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Globe2, Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import type { Address } from "viem";
import { useSignMessage } from "wagmi";
import { buildAdminMessage } from "@/lib/launchpad/auth-message";
import { LAUNCHPAD_CONFIG_QUERY_KEY } from "@/hooks/use-launchpad-config";
import { hashLaunchpadPayload } from "@/lib/launchpad/stable";
import type { LaunchpadConfig } from "@/lib/launchpad/types";
import {
  ELYSIUM_CHAINS,
  getChainRpcUrl,
  getElysiumChain,
  type ElysiumChainId,
} from "@/lib/chains";
import { shortAddress } from "@/lib/format";
import {
  type AdminResponse,
  launchpadAdminKey,
  useLaunchpadAdminData,
} from "./admin-data";
import {
  CardHeading,
  ConsoleSkeleton,
  Field,
  Notice,
  Panel,
  StatusPill,
} from "./admin-ui";
import { responseError, txError } from "./admin-utils";

type NetworkForm = {
  chainId: ElysiumChainId;
  rpcUrl: string;
};

export function NetworkRuntimePanel({ address }: { address?: Address }) {
  const queryClient = useQueryClient();
  const { signMessageAsync } = useSignMessage();
  const { publicConfig, adminQuery, admin } = useLaunchpadAdminData(address);

  const [draft, setDraft] = useState<NetworkForm | null>(null);
  const [saving, setSaving] = useState(false);

  const current = adminQuery.data?.config ?? publicConfig.data;
  const fallback: NetworkForm | null = current
    ? {
        chainId: current.chainId as ElysiumChainId,
        rpcUrl: current.rpcUrl,
      }
    : null;
  const form = draft ?? fallback;
  const isAdmin = admin?.authorized === true;
  const dirty = draft !== null;

  function update(patch: Partial<NetworkForm>) {
    const base = draft ?? fallback;
    if (!base) return;
    setDraft({ ...base, ...patch });
  }

  async function save() {
    if (!address || !form || saving || !isAdmin) return;

    const payload = {
      chainId: form.chainId,
      rpcUrl: form.rpcUrl.trim(),
    };

    if (!payload.rpcUrl) {
      toast.error("Enter an RPC URL.");
      return;
    }

    setSaving(true);

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = buildAdminMessage({
        action: "update-launchpad",
        address,
        timestamp,
        payloadHash: hashLaunchpadPayload(payload),
      });
      const signature = await signMessageAsync({ message });
      const response = await fetch("/api/admin/launchpad", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, timestamp, signature, payload }),
      });

      if (!response.ok) throw new Error(await responseError(response));

      const data = (await response.json()) as { config: LaunchpadConfig };
      queryClient.setQueryData<AdminResponse>(
        launchpadAdminKey(address),
        (previous) =>
          previous ? { ...previous, config: data.config } : previous,
      );
      setDraft(null);
      void queryClient.invalidateQueries({
        queryKey: LAUNCHPAD_CONFIG_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "launchpad-contract",
      });
      void adminQuery.refetch();

      toast.success("Network saved", {
        description:
          "The app now uses this chain and RPC for collection reads and writes.",
      });
    } catch (error) {
      toast.error("Could not save the network", {
        description: txError(error),
      });
    } finally {
      setSaving(false);
    }
  }

  if (publicConfig.isPending) {
    return <ConsoleSkeleton cards={1} />;
  }

  if (publicConfig.isError) {
    return (
      <Notice
        tone="danger"
        title="Could not load the network settings"
        body={publicConfig.error.message}
        action={
          <button
            type="button"
            onClick={() => void publicConfig.refetch()}
            className="btn-ghost h-9 px-4 text-[10px]"
          >
            <RefreshCw className="size-3.5" />
            Retry
          </button>
        }
      />
    );
  }

  if (!form) return null;

  const disabled = !isAdmin || saving;

  return (
    <Panel>
      <CardHeading
        icon={Globe2}
        title="Network & runtime"
        description="The Elysium network and RPC the app uses for every collection read and write."
        aside={
          <div className="flex flex-wrap justify-end gap-2">
            {dirty ? <StatusPill tone="warn">Unsaved</StatusPill> : null}
            <StatusPill tone={isAdmin ? "mint" : "muted"}>
              {isAdmin ? "Settings admin" : "View only"}
            </StatusPill>
          </div>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field
          label="Elysium network"
          hint="Changing the chain also selects that chain's default RPC."
        >
          <select
            value={form.chainId}
            onChange={(event) => {
              const chainId = Number(event.target.value) as ElysiumChainId;
              update({ chainId, rpcUrl: getChainRpcUrl(chainId) });
            }}
            disabled={disabled}
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
          label="RPC URL"
          hint="The server verifies the chain ID and collection bytecode before saving."
        >
          <input
            value={form.rpcUrl}
            onChange={(event) => update({ rpcUrl: event.target.value })}
            disabled={disabled}
            className="input"
            placeholder={getChainRpcUrl(form.chainId)}
            spellCheck={false}
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
            Collection
          </span>
          <span className="font-mono text-[10px] text-paper-dim">
            {shortAddress(current?.collectionAddress, 6)}
          </span>
          <span className="text-[9px] text-paper-mute">
            · {getElysiumChain(form.chainId).name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {dirty ? (
            <button
              type="button"
              onClick={() => setDraft(null)}
              disabled={saving}
              className="text-[10px] text-paper-mute transition hover:text-paper"
            >
              Discard
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void save()}
            disabled={!isAdmin || saving || !dirty}
            className="btn-primary h-10 px-4 text-[11px]"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save network
          </button>
        </div>
      </div>

      <p className="mt-2 text-[9px] leading-5 text-paper-mute">
        {isAdmin
          ? "Saving signs a short-lived message. No gas and no contract transaction."
          : "Connect the collection owner or a settings admin to change the network."}
      </p>

      {adminQuery.isError ? (
        <div className="mt-3">
          <Notice
            tone="danger"
            title="Could not verify settings access"
            body={adminQuery.error.message}
            action={
              <button
                type="button"
                onClick={() => void adminQuery.refetch()}
                className="btn-ghost h-9 px-4 text-[10px]"
              >
                <RefreshCw className="size-3.5" />
                Retry
              </button>
            }
          />
        </div>
      ) : null}
    </Panel>
  );
}
