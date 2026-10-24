import { keccak256, stringToHex } from "viem";

export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(
        ([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function hashLaunchpadPayload(payload: unknown) {
  return keccak256(stringToHex(stableStringify(payload)));
}
