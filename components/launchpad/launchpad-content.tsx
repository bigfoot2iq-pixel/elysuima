"use client";

import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
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

  const inspection = useMemo<ContractInspection | undefined>(() => {
    if (!config) return undefined;
    if (contractQuery.data) return contractQuery.data;
    if (!contractQuery.isError) return undefined;
    return {
      ok: false,
      rpcUrl: config.rpcUrl,
      collectionAddress: config.collectionAddress,
      methods: [],
      message:
        "The collection could not be read from the configured RPC. Minting is disabled until it recovers.",
    };
  }, [config, contractQuery.data, contractQuery.isError]);

  // The contract route caches its inspection for a few seconds, so a mint is
  // not visible on the next read. Keep the supply the visitor just contributed
  // as a floor: the progress UI moves immediately and the floor stops applying
  // as soon as the chain reports the same (or a higher) total.
  const [mintedFloor, setMintedFloor] = useState<{
    collection: string;
    supply: number;
  } | null>(null);

  const activeFloor =
    mintedFloor && mintedFloor.collection === config?.collectionAddress
      ? mintedFloor.supply
      : null;

  const displayInspection = useMemo(() => {
    if (!inspection || activeFloor === null) return inspection;
    const chain = Number(inspection.totalSupply ?? 0);
    if (chain >= activeFloor) return inspection;
    return { ...inspection, totalSupply: String(activeFloor) };
  }, [inspection, activeFloor]);

  const refetchContract = contractQuery.refetch;

  const handleMintConfirmed = useCallback(
    (quantity: number) => {
      if (!config) return;
      const collection = config.collectionAddress;
      const chain = Number(inspection?.totalSupply ?? 0);
      setMintedFloor((floor) => {
        const base =
          floor && floor.collection === collection ? floor.supply : chain;
        return {
          collection,
          supply: Math.max(chain, base) + quantity,
        };
      });
      // Pull the real supply as soon as the route cache lets a fresh read
      // through; the optimistic floor above covers the gap.
      void refetchContract();
    },
    [config, inspection?.totalSupply, refetchContract],
  );

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

  return (
    <>
      <LaunchpadSummary
        config={config}
        inspection={displayInspection}
        now={now}
      />

      <section className="section-shell pb-2 pt-6">
        {/* The preview takes the free width and the mint panel holds a fixed
            rail on the right, so both columns line up with the summary card
            above instead of floating in the middle of the page. */}
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-5">
          <LaunchpadPreview />
          <MintCard
            config={config}
            inspection={displayInspection}
            now={now}
            onMintConfirmed={handleMintConfirmed}
          />
        </div>
      </section>

      <LaunchpadFaq config={config} inspection={displayInspection} />
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

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-5">
        <div className="glass animate-pulse rounded-[28px] p-3 sm:p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_212px] xl:gap-5">
            <div className="mx-auto aspect-square w-full max-w-[520px] rounded-2xl bg-paper/[0.05] xl:mx-0 xl:max-w-none" />
            <div className="flex min-w-0 flex-col gap-4">
              <div className="space-y-3">
                <div className="h-3 w-16 rounded-full bg-paper/[0.06]" />
                <div className="h-5 w-28 rounded-full bg-paper/[0.07]" />
                <div className="h-3 w-32 rounded-full bg-paper/[0.05]" />
                <div className="h-14 w-full rounded-xl bg-paper/[0.04]" />
              </div>
              <div className="@container min-w-0 border-t border-paper/[0.07] pt-4">
                <div className="grid grid-cols-1 gap-2 @min-[320px]:grid-cols-2">
                  {[0, 1, 2, 3, 4, 5].map((item) => (
                    <div
                      key={item}
                      className="h-12 rounded-xl bg-paper/[0.04]"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="glass h-[460px] animate-pulse rounded-[28px]" />
      </div>
    </div>
  );
}