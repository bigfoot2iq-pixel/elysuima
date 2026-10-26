"use client";

import { useQuery } from "@tanstack/react-query";

export const ADMIN_SESSION_QUERY_KEY = ["admin-session"] as const;

export type AdminSessionStatus = {
  authenticated: boolean;
  address: string | null;
  expiresAt: number | null;
  owner: string;
  sessionSeconds: number;
  loginWindowSeconds: number;
};

/**
 * Reads the owner-console session from the server. The claim page uses the
 * same 12-hour session as `/admin`, so the shared navigation only shows the
 * private claim link once that session is valid.
 */
export function useAdminSession() {
  return useQuery<AdminSessionStatus>({
    queryKey: ADMIN_SESSION_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/admin/session", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Unable to read the owner session (HTTP ${response.status}).`,
        );
      }

      return (await response.json()) as AdminSessionStatus;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
