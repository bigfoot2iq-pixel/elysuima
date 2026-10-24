"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import type { LaunchpadAdminSource } from "@/lib/launchpad/types";

type ClaimAccessResponse = {
  authorized: boolean;
  sources: LaunchpadAdminSource[];
};

/**
 * Resolves whether the connected wallet can open the daily claim. The check is
 * shared through React Query, so the header, footer, and claim page all read
 * the same result instead of asking the server repeatedly.
 */
export function useClaimAccess() {
  const { address, status } = useAccount();

  const query = useQuery<ClaimAccessResponse>({
    queryKey: ["claim-access", address?.toLowerCase()],
    enabled: Boolean(address),
    queryFn: async () => {
      const response = await fetch(
        `/api/claim/access?address=${encodeURIComponent(address ?? "")}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message ?? "The claim access check could not be completed.",
        );
      }

      return (await response.json()) as ClaimAccessResponse;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const connecting = status === "connecting" || status === "reconnecting";

  return {
    address: address as Address | undefined,
    authorized: Boolean(address) && query.data?.authorized === true,
    checking: connecting || (Boolean(address) && query.isPending),
    error: query.isError ? query.error : undefined,
    sources: query.data?.sources ?? [],
    refetch: query.refetch,
  };
}
