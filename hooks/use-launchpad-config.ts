"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useLaunchpadContract(address?: string) {
  return useQuery<ContractInspection>({
    queryKey: ["launchpad-contract", address?.toLowerCase()],
    enabled: Boolean(address),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
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
