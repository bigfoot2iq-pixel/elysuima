"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarOff,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import type { Address } from "viem";
import { useSignMessage } from "wagmi";
import { useNow } from "@/hooks/use-now";
import { LAUNCHPAD_CONFIG_QUERY_KEY } from "@/hooks/use-launchpad-config";
import { buildAdminMessage } from "@/lib/launchpad/auth-message";
import { hashLaunchpadPayload } from "@/lib/launchpad/stable";
import type { LaunchpadConfig } from "@/lib/launchpad/types";
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

type ScheduleAction = "save" | "clear";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Converts unix seconds to the local value a datetime-local input expects. */
function toLocalInput(seconds: number) {
  const date = new Date(seconds * 1_000);
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join("T");
}

/** Parses the local input back to unix seconds, or null when invalid. */
function fromLocalInput(value: string) {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1_000);
}

function formatSchedule(seconds: number) {
  // `dateStyle`/`timeStyle` cannot be combined with `timeZoneName`; that throws
  // a TypeError. Spell out the parts so the zone abbreviation is included.
  return new Date(seconds * 1_000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function LaunchpadSchedulePanel({ address }: { address?: Address }) {
  const queryClient = useQueryClient();
  const { signMessageAsync } = useSignMessage();
  const { publicConfig, adminQuery, admin } = useLaunchpadAdminData(address);

  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState<ScheduleAction | null>(null);
  const now = useNow(30_000);

  const current = adminQuery.data?.config ?? publicConfig.data;
  const currentStart = current?.startAt ?? 0;
  const savedInput = currentStart > 0 ? toLocalInput(currentStart) : "";
  const value = draft ?? savedInput;

  const isAdmin = admin?.authorized === true;
  const saving = pending !== null;
  const dirty = draft !== null && draft !== savedInput;
  const scheduled = currentStart > 0 && currentStart > now;

  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "local time";
    }
  }, []);

  async function saveSchedule(action: ScheduleAction) {
    if (!address || saving || !isAdmin) return;

    let startAt = 0;

    if (action === "save") {
      const parsed = value.trim() ? fromLocalInput(value) : null;
      if (parsed === null) {
        toast.error("Choose a start date and time.");
        return;
      }
      if (parsed <= Math.floor(Date.now() / 1_000)) {
        toast.error("Choose a start time in the future.");
        return;
      }
      startAt = parsed;
    }

    setPending(action);

    try {
      const timestamp = Math.floor(Date.now() / 1_000);
      const payload = { startAt };
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

      toast.success(
        action === "clear" ? "Schedule removed" : "Launch scheduled",
        {
          description:
            action === "clear"
              ? "The mint button is available immediately again."
              : "Visitors see the countdown on the mint button until the start time, then it becomes mintable automatically.",
        },
      );
    } catch (error) {
      toast.error(
        action === "clear"
          ? "Could not remove the schedule"
          : "Could not save the schedule",
        { description: txError(error) },
      );
    } finally {
      setPending(null);
    }
  }

  if (publicConfig.isPending) {
    return <ConsoleSkeleton cards={1} />;
  }

  if (publicConfig.isError) {
    return (
      <Notice
        tone="danger"
        title="Could not load the launch schedule"
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

  const disabled = !isAdmin || saving;

  return (
    <Panel>
      <CardHeading
        icon={CalendarClock}
        title="Launch schedule"
        description="Show a countdown on the mint button until a date and time you choose. The rest of the launchpad stays visible."
        aside={
          <div className="flex flex-wrap justify-end gap-2">
            {dirty ? <StatusPill tone="warn">Unsaved</StatusPill> : null}
            <StatusPill
              tone={
                currentStart === 0 ? "mint" : scheduled ? "brand" : "muted"
              }
            >
              {currentStart === 0
                ? "Live now"
                : scheduled
                  ? "Scheduled"
                  : "Started"}
            </StatusPill>
          </div>
        }
      />

      <div className="mt-5 rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
            Current schedule
          </span>
          <span className="text-right font-mono text-[10px] text-paper-dim">
            {currentStart > 0
              ? formatSchedule(currentStart)
              : "No start time — the mint button is live"}
          </span>
        </div>
        {currentStart > 0 ? (
          <p className="mt-2 text-[10px] leading-5 text-paper-mute">
            {scheduled
              ? "Visitors see the countdown on the mint button until then. It becomes mintable automatically at the start time."
              : "This start time has passed. Remove it to clear the saved schedule."}
          </p>
        ) : null}
      </div>

      <div className="mt-4 max-w-md">
        <Field
          label="Start date & time"
          hint={`Uses this device's timezone (${timeZone}).`}
        >
          <input
            type="datetime-local"
            value={value}
            onChange={(event) => setDraft(event.target.value)}
            disabled={disabled}
            step={60}
            className="input"
            aria-label="Launch start date and time"
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
            {isAdmin ? "Signs a message" : "View only"}
          </span>
          <span className="font-mono text-[10px] text-paper-dim">
            {currentStart > 0 ? "Countdown enabled" : "Countdown off"}
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
          {currentStart > 0 ? (
            <button
              type="button"
              onClick={() => void saveSchedule("clear")}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 text-[10px] text-paper-mute transition hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === "clear" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CalendarOff className="size-3.5" />
              )}
              Remove schedule
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void saveSchedule("save")}
            disabled={disabled || !dirty}
            className="btn-primary h-10 px-4 text-[11px]"
          >
            {pending === "save" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save schedule
          </button>
        </div>
      </div>

      <p className="mt-2 text-[9px] leading-5 text-paper-mute">
        {isAdmin
          ? "Saving signs a short-lived message. No gas and no contract transaction. The countdown is a launchpad setting, not an on-chain limit."
          : "Connect the collection owner or a settings admin to schedule the launch."}
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
