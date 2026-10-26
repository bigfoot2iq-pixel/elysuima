"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { IS_CONFIGURED } from "@/lib/config";
import type { ClaimEligibility } from "@/lib/server/claim-eligibility";

export function useClaimEligibility(address?: Address) {
  return useQuery<ClaimEligibility>({
    queryKey: ["claim-eligibility", address?.toLowerCase()],
    enabled: Boolean(address) && IS_CONFIGURED,
    queryFn: async () => {
      const response = await fetch("/api/claim/eligibility", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
        cache: "no-store",
      });

      const payload = (await response.json()) as ClaimEligibility & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.message ?? "Unable to read claim eligibility.",
        );
      }

      return payload;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
