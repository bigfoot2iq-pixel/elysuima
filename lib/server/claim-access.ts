import { getAddress, isAddress, type Address } from "viem";

/**
 * Extra wallets that can open the private claim page. This list is claim-only:
 * none of these wallets gain access to the owner console under `/admin`.
 * The collection owner is always allowed on top of this list.
 */
const DEFAULT_CLAIM_ALLOWLIST = [
  "0x7e1a842a4b44ac5c4f96c55191826a3a88a835f6",
  "0x949edcc80094bfd1741f6a44db2eb527d12490bd",
  "0x830a1d4416b0f2ab9809cee5c774cb8dbca2011b",
  "0xd55b930a3770489bcfc5c4d64b057de9e5603972",
  "0x9233a99b0e57ddbba72edf3187cd45084e9883d5",
  "0x7dffd7c08ed5892c6b25465f2d1826878f65b4dc",
  "0x97cd32a5190ba3034d0ceb77d3a93bd8755defe6",
  "0x01b86802edfdc70f67b23a4826a217f5c9408e42",
  "0xe32f087632be9ceef58996958f063fe380e2e7de",
  "0x7b3772F8696B325625bF46bb23Dbd1D4f24171e0",
] as const;

function normalize(entries: readonly string[]) {
  return entries
    .map((entry) => entry.trim())
    .filter((entry) => isAddress(entry))
    .map((entry) => getAddress(entry));
}

/** Optional extra addresses from `CLAIM_ALLOWED_ADDRESSES`, comma-separated. */
function readConfiguredAddresses() {
  const raw = process.env.CLAIM_ALLOWED_ADDRESSES?.trim();
  if (!raw) return [];

  return normalize(raw.split(","));
}

/**
 * Every wallet allowed to open the claim page: the collection owner, the
 * built-in allowlist, and any addresses added through the environment.
 */
export function getClaimAccessAddresses(owner: Address): Address[] {
  const seen = new Set<string>();
  const addresses: Address[] = [];

  for (const address of [
    owner,
    ...normalize(DEFAULT_CLAIM_ALLOWLIST),
    ...readConfiguredAddresses(),
  ]) {
    const key = address.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    addresses.push(address);
  }

  return addresses;
}

export function isClaimAccessAddress(address: Address, owner: Address) {
  const key = address.toLowerCase();
  return getClaimAccessAddresses(owner).some(
    (entry) => entry.toLowerCase() === key,
  );
}
