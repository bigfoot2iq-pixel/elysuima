import { BaseError, formatUnits } from "viem";
import type {
  LaunchpadAdminSource,
  LaunchpadConfig,
} from "@/lib/launchpad/types";

export const NATIVE_DECIMALS = 18;

/** Token id used to reverse-engineer the collection base URI. */
export const PROBE_TOKEN_ID = 1n;

export function txError(error: unknown) {
  if (error instanceof BaseError) return error.shortMessage;
  if (error instanceof Error) return error.message.split("\n")[0];
  return "The transaction could not be submitted.";
}

export function formatUnix(seconds: number) {
  if (!seconds) return "not set";
  return new Date(seconds * 1000).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Formats wei as HYPE without trailing zeros in the fractional part. */
export function formatHype(value: bigint) {
  const [whole, fraction = ""] = formatUnits(value, NATIVE_DECIMALS).split(".");
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

/**
 * The collection appends `{tokenId}.json` to the base URI, so the base URI can
 * be recovered from any minted token's URI.
 */
export function deriveBaseUri(uri: string | undefined) {
  if (!uri) return undefined;
  const suffix = `${PROBE_TOKEN_ID}.json`;
  return uri.endsWith(suffix) ? uri.slice(0, -suffix.length) : uri;
}

export function sameAddress(a?: string | null, b?: string | null) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

/**
 * Strips the public-only `chain` and `configured` fields before a config is
 * edited or signed, so the payload is exactly the persisted shape.
 */
export function toLaunchpadConfig(config: LaunchpadConfig): LaunchpadConfig {
  return {
    enabled: config.enabled,
    startAt: config.startAt,
    mintBalanceCheck: config.mintBalanceCheck,
    chainId: config.chainId,
    collectionAddress: config.collectionAddress,
    rpcUrl: config.rpcUrl,
    maxPerWallet: config.maxPerWallet,
    maxSupply: config.maxSupply,
    mintPrice: config.mintPrice,
    mintMethod: config.mintMethod,
    seaDropAddress: config.seaDropAddress,
    feeRecipient: config.feeRecipient,
    title: config.title,
    tagline: config.tagline,
    description: config.description,
    coverImage: config.coverImage,
    websiteUrl: config.websiteUrl,
    twitterUrl: config.twitterUrl,
    discordUrl: config.discordUrl,
  };
}

export function formatSources(sources: LaunchpadAdminSource[] | undefined) {
  if (!sources || sources.length === 0) return "on-chain ownership";

  return sources
    .map((source) => {
      switch (source) {
        case "collection-owner":
          return "collection ownership";
        case "claim-owner":
          return "claim ownership";
        case "allowlist":
          return "the admin allowlist";
      }
    })
    .join(" · ");
}

export async function responseError(response: Response) {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? `Request failed with HTTP ${response.status}.`;
  } catch {
    return `Request failed with HTTP ${response.status}.`;
  }
}
