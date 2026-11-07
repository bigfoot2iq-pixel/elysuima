import { isAddress } from "viem";

/**
 * The only wallet allowed into `/checker`. This is public information: it is
 * inlined into the browser bundle so the page, header, and footer can hide the
 * checker for every other wallet.
 */
const DEFAULT_CHECKER_ACCESS_ADDRESS =
  "0xa4575566BF5386CB5ba48EdcBeA71235bD94fE4d";

export const CHECKER_ACCESS_ADDRESS =
  process.env.NEXT_PUBLIC_CHECKER_ACCESS_ADDRESS?.trim() ||
  DEFAULT_CHECKER_ACCESS_ADDRESS;

export function isCheckerAddress(address?: string | null) {
  if (!address || !isAddress(address, { strict: false })) return false;
  return address.toLowerCase() === CHECKER_ACCESS_ADDRESS.toLowerCase();
}
