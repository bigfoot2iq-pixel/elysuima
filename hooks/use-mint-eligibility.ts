"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import type { MintEligibilityResponse } from "@/lib/mint-eligibility";

export function useMintEligibility(address?: Address) {
  return useQuery<MintEligibilityResponse>({
    queryKey: ["mint-eligibility", address?.toLowerCase()],
    enabled: Boolean(address),
    queryFn: async () => {
      const response = await fetch("/api/mint/eligibility", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
        cache: "no-store",
      });

      const payload = (await response.json()) as MintEligibilityResponse & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.message ?? "Unable to check this wallet right now.",
        );
      }

      return payload;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 0,
  });
}
