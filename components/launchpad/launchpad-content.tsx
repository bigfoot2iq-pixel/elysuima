"use client";

import { useSyncExternalStore } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  useLaunchpadConfig,
  useLaunchpadContract,
} from "@/hooks/use-launchpad-config";
import type { ContractInspection } from "@/lib/launchpad/types";
import { LaunchpadFaq } from "./launchpad-faq";
import { LaunchpadPreview } from "./launchpad-preview";
import { LaunchpadSummary } from "./launchpad-summary";
import { MintCard } from "./mint-card";

let currentNow = Math.floor(Date.now() / 1000);

function subscribeToClock(callback: () => void) {
  currentNow = Math.floor(Date.now() / 1000);
  const timer = setInterval(() => {
    currentNow = Math.floor(Date.now() / 1000);
    callback();
  }, 30_000);
  return () => clearInterval(timer);
}

function clockSnapshot() {
  return currentNow;
}

function serverClockSnapshot() {
  return 0;
}

// Hydration flag. The value is a constant that flips from false to true the
// moment the client takes over, so it only needs to be read once.
function subscribeToHydration() {
  return () => {};
}

function clientHydrationSnapshot() {
  return true;
}

function serverHydrationSnapshot() {
  return false;
}

export function LaunchpadContent() {
  const configQuery = useLaunchpadConfig();
  const config = configQuery.data;
  const configured = Boolean(config?.collectionAddress);
  const contractQuery = useLaunchpadContract(
    configured ? config?.collectionAddress : undefined,
  );
  const now = useSyncExternalStore(
    subscribeToClock,
    clockSnapshot,
    serverClockSnapshot,
  );

  // The launchpad data is fetched on the client, so the server can only ever
  // render the skeleton. If the query cache already holds data on the client's
  // first render, the server and client trees would differ and React would
  // discard the server HTML. Report "not hydrated yet" on the server and during
  // the hydration pass so both trees render the skeleton, then flip to true.
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientHydrationSnapshot,
    serverHydrationSnapshot,
  );

  const waitingForContract =
    configured && !contractQuery.data && !contractQuery.isError;

  if (!hydrated || configQuery.isPending || waitingForContract) {
    return <LaunchpadSkeleton />;
  }

  if (configQuery.isError || !config) {
    return (
      <div className="section-shell pb-24 pt-16">
        <div className="glass mx-auto max-w-lg rounded-2xl p-6 text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="size-4" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-paper">
            The launchpad is unavailable
          </h1>
          <p className="mt-2 text-[11px] leading-6 text-paper-mute">
            {configQuery.error?.message ??
              "The launchpad settings could not be loaded. The RPC or the config file may be unavailable."}
          </p>
          <button
            type="button"
            onClick={() => void configQuery.refetch()}
            className="btn-ghost mt-5 px-5"
          >
            <RefreshCw className="size-3.5" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  const inspection: ContractInspection | undefined =
    contractQuery.data ??
    (contractQuery.isError
      ? {
          ok: false,
          rpcUrl: config.rpcUrl,
          collectionAddress: config.collectionAddress,
          methods: [],
          message:
            "The collection could not be read from the configured RPC. Minting is disabled until it recovers.",
        }
      : undefined);

  return (
    <>
      <LaunchpadSummary config={config} inspection={inspection} now={now} />

      <section className="section-shell pb-6 pt-4">
        <div className="grid items-start gap-4 lg:grid-cols-[380px_minmax(0,420px)] lg:justify-center">
          <LaunchpadPreview />
          <MintCard config={config} inspection={inspection} now={now} />
        </div>
      </section>

      <LaunchpadFaq config={config} inspection={inspection} />
    </>
  );
}

function LaunchpadSkeleton() {
  return (
    <div className="section-shell pb-20 pt-10 sm:pt-14">
      <div className="glass animate-pulse rounded-[28px] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-paper/[0.06]" />
          <div className="space-y-2">
            <div className="h-4 w-40 rounded-full bg-paper/[0.06]" />
            <div className="h-3 w-56 rounded-full bg-paper/[0.05]" />
          </div>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-paper/[0.07] bg-paper/[0.06] sm:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="bg-ink/70 px-3.5 py-2.5">
              <div className="h-3.5 w-16 rounded-full bg-paper/[0.07]" />
              <div className="mt-2 h-2.5 w-12 rounded-full bg-paper/[0.05]" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[380px_minmax(0,420px)] lg:justify-center">
        <div className="glass aspect-square animate-pulse rounded-2xl" />
        <div className="glass h-[420px] animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}