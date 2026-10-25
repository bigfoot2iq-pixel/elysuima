"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { Address } from "viem";
import { useSignMessage } from "wagmi";
import { LAUNCHPAD_CONFIG_QUERY_KEY } from "@/hooks/use-launchpad-config";
import { buildAdminMessage } from "@/lib/launchpad/auth-message";
import { getMintMinimumBalance } from "@/lib/launchpad/balance";
import { hashLaunchpadPayload } from "@/lib/launchpad/stable";
import type { LaunchpadConfig } from "@/lib/launchpad/types";
import { getElysiumChain } from "@/lib/chains";
import { formatAmount } from "@/lib/format";
import {
  type AdminResponse,
  launchpadAdminKey,
  useLaunchpadAdminData,
} from "./admin-data";
import {
  CardHeading,
  ConsoleSkeleton,
  Notice,
  Panel,
  StatusPill,
  Switch,
} from "./admin-ui";
import { responseError, txError } from "./admin-utils";

export function LaunchpadMintPanel({ address }: { address?: Address }) {
  const queryClient = useQueryClient();
  const { signMessageAsync } = useSignMessage();
  const { publicConfig, adminQuery, admin } = useLaunchpadAdminData(address);

  const [draft, setDraft] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const current = adminQuery.data?.config ?? publicConfig.data;
  const saved = current?.mintBalanceCheck ?? true;
  const enabled = draft ?? saved;
  const isAdmin = admin?.authorized === true;
  const dirty = draft !== null && draft !== saved;
  const disabled = !isAdmin || saving;

  const chain = current ? getElysiumChain(current.chainId) : undefined;
  const minimum = chain
    ? getMintMinimumBalance(
        chain.nativeCurrency.symbol,
        chain.nativeCurrency.decimals,
      )
    : undefined;
  const minimumLabel =
    chain && minimum !== undefined
      ? `${formatAmount(minimum, chain.nativeCurrency.decimals, 4)} ${chain.nativeCurrency.symbol}`
      : "the configured minimum";

  async function save() {
    if (!address || saving || !isAdmin || !dirty) return;

    const payload = { mintBalanceCheck: enabled };
    setSaving(true);

    try {
      const timestamp = Math.floor(Date.now() / 1_000);
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
      void adminQuery.refetch();

      toast.success(
        enabled ? "Minimum balance required" : "Minimum balance check disabled",
        {
          description: enabled
            ? `The mint button now requires at least ${minimumLabel} on ${chain?.name ?? "the active chain"}.`
            : "Visitors can mint without the launchpad checking their wallet balance.",
        },
      );
    } catch (error) {
      toast.error("Could not save the mint requirement", {
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
        title="Could not load the mint requirement"
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

  if (!current) return null;

  return (
    <Panel>
      <CardHeading
        icon={ShieldCheck}
        title="Mint requirements"
        description="Require a minimum native-token balance before the launchpad enables the mint button."
        aside={
          <div className="flex flex-wrap justify-end gap-2">
            {dirty ? <StatusPill tone="warn">Unsaved</StatusPill> : null}
            <StatusPill tone={enabled ? "mint" : "muted"}>
              {enabled ? "Required" : "Off"}
            </StatusPill>
          </div>
        }
      />

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3.5">
        <Switch
          checked={enabled}
          onCheckedChange={setDraft}
          disabled={disabled}
          label="Require a minimum wallet balance before minting"
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-paper">
            Require minimum wallet balance
          </p>
          <p className="mt-1 max-w-xl text-[11px] leading-5 text-paper-mute">
            {enabled
              ? `The mint button stays disabled until the wallet holds at least ${minimumLabel} on ${chain?.name ?? "the active chain"}, or the mint total when that is higher.`
              : "The mint button no longer checks the wallet balance. A wallet with insufficient funds can still submit and let the wallet or contract reject the transaction."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
            {isAdmin ? "Signs a message" : "View only"}
          </span>
          <span className="font-mono text-[10px] text-paper-dim">
            {saved ? `Current minimum ${minimumLabel}` : "Current balance check off"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
            disabled={disabled || !dirty}
            className="btn-primary h-10 px-4 text-[11px]"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save requirement
          </button>
        </div>
      </div>

      <p className="mt-2 text-[9px] leading-5 text-paper-mute">
        {isAdmin
          ? "This is a launchpad UI guard only. It does not stop a wallet from calling the collection contract directly. Saving signs a short-lived message; no gas and no contract transaction."
          : "Connect the collection owner or a settings admin to change the mint requirement."}
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
