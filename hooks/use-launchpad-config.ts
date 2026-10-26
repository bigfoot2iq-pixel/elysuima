"use client";

import { useEffect, useRef } from "react";
import {
  replaceEqualDeep,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getRuntimeNetwork, setRuntimeNetwork } from "@/lib/launchpad/runtime";
import type {
  ContractInspection,
  PublicLaunchpadConfig,
} from "@/lib/launchpad/types";

export const LAUNCHPAD_CONFIG_QUERY_KEY = ["launchpad-config"] as const;

async function responseError(response: Response) {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? `Request failed with HTTP ${response.status}.`;
  } catch {
    return `Request failed with HTTP ${response.status}.`;
  }
}

export async function fetchLaunchpadConfig() {
  const response = await fetch("/api/launchpad/config", { cache: "no-store" });
  if (!response.ok) throw new Error(await responseError(response));
  const data = (await response.json()) as { config: PublicLaunchpadConfig };
  return data.config;
}

export function useLaunchpadConfig() {
  return useQuery<PublicLaunchpadConfig>({
    queryKey: LAUNCHPAD_CONFIG_QUERY_KEY,
    queryFn: fetchLaunchpadConfig,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Keeps the last successfully read supply when a refetch returns a degraded
 * inspection. The RPC sometimes drops the supply calls while the price/phase
 * calls succeed; replacing the values with undefined would make the summary
 * show "Open" / "0" even though the collection reports 2,222 / 191.
 */
function keepLastSupply(
  previous: ContractInspection | undefined,
  next: ContractInspection,
) {
  if (
    !previous ||
    previous.collectionAddress !== next.collectionAddress ||
    (next.totalSupply !== undefined && next.maxSupply !== undefined) ||
    (previous.totalSupply === undefined && previous.maxSupply === undefined)
  ) {
    return next;
  }

  return {
    ...next,
    totalSupply: next.totalSupply ?? previous.totalSupply,
    maxSupply: next.maxSupply ?? previous.maxSupply,
  };
}

export function useLaunchpadContract(address?: string) {
  return useQuery<ContractInspection>({
    queryKey: ["launchpad-contract", address?.toLowerCase()],
    enabled: Boolean(address),
    staleTime: 15_000,
    structuralSharing: (previous, next) =>
      replaceEqualDeep(
        previous,
        keepLastSupply(
          previous as ContractInspection | undefined,
          next as ContractInspection,
        ),
      ),
    // Supply and cap are deliberately not polled: the RPC occasionally drops
    // one of the concurrent reads, and a failed poll used to flip a 2,222
    // supply into "Open" / "0". The initial load reads them, and a confirmed
    // mint invalidates this query explicitly. Only a degraded inspection is
    // polled, so it can recover without changing stable values.
    refetchInterval: (query) => {
      const inspection = query.state.data;
      if (!inspection) return false;
      if (!inspection.ok || inspection.elyziumaDropError) return 5_000;
      if (inspection.supplyError) return 5_000;
      return false;
    },
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const response = await fetch(
        `/api/launchpad/contract?address=${encodeURIComponent(address ?? "")}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const data = (await response.json()) as {
        inspection: ContractInspection;
      };
      return data.inspection;
    },
  });
}

/**
 * Applies the admin-configured network to the wagmi transport. The chain, the
 * RPC, and the explorer are switched together, so reads start on the right
 * network without rebuilding the app.
 */
export function useRuntimeNetworkSync() {
  const query = useLaunchpadConfig();
  const queryClient = useQueryClient();
  const appliedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const config = query.data;
    if (!config) return;

    const { chainId, rpcUrl } = config;
    const explorerUrl = config.chain.explorerUrl;
    const key = `${chainId}|${rpcUrl}|${explorerUrl}`;
    if (appliedRef.current === key) return;

    const previous = getRuntimeNetwork();
    appliedRef.current = key;
    setRuntimeNetwork({ chainId, rpcUrl, explorerUrl });

    if (previous.chainId !== chainId || previous.rpcUrl !== rpcUrl) {
      void queryClient.invalidateQueries({
        predicate: (item) => item.queryKey[0] !== "launchpad-config",
      });
    }
  }, [query.data, queryClient]);

  return query;
}
