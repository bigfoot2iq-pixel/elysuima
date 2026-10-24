"use client";

import type { ReactNode } from "react";
import { useClaimAccess } from "@/hooks/use-claim-access";

/**
 * Renders its children only while the connected wallet has access to the
 * private claim preview. Used to hide claim entry points for everyone else.
 */
export function ClaimAccessOnly({ children }: { children: ReactNode }) {
  const { authorized } = useClaimAccess();
  return authorized ? <>{children}</> : null;
}
