"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import type { EligibilityResponse } from "@/lib/eligibility-types";

export function useEligibility(address?: Address) {
  return useQuery<EligibilityResponse>({
    queryKey: ["eligibility", address?.toLowerCase()],
    enabled: Boolean(address),
    queryFn: async () => {
      const response = await fetch("/api/eligibility", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
        cache: "no-store",
      });

      const payload = (await response.json()) as EligibilityResponse & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to verify eligibility.");
      }

      return payload;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
