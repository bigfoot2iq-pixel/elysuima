import { getAddress, isAddress, parseUnits } from "viem";
import {
  ELYSIUM_CHAIN_IDS,
  getChainExplorerUrl,
  getChainRpcUrl,
  getDefaultChainId,
  getElysiumChain,
  isElysiumChainId,
} from "@/lib/chains";
import {
  MINT_METHODS,
  type LaunchpadConfig,
  type LaunchpadChainInfo,
  type MintMethod,
  type PublicLaunchpadConfig,
} from "./types";

const MINT_METHOD_IDS = new Set<string>(MINT_METHODS.map((method) => method.id));

export class LaunchpadConfigError extends Error {
  readonly fields: string[];

  constructor(message: string, fields: string[] = []) {
    super(message);
    this.name = "LaunchpadConfigError";
    this.fields = fields;
  }
}

const envCollectionAddress =
  process.env.NEXT_PUBLIC_LAUNCHPAD_COLLECTION_ADDRESS?.trim() ?? "";

export function getDefaultLaunchpadConfig(): LaunchpadConfig {
  const chainId = getDefaultChainId();

  return {
    enabled: true,
    startAt: 0,
    mintBalanceCheck: true,
    chainId,
    collectionAddress:
      envCollectionAddress && isAddress(envCollectionAddress)
        ? getAddress(envCollectionAddress)
        : "",
    rpcUrl:
      normalizeRpcUrl(
        process.env.ELYSIUM_RPC_URL ??
          process.env.NEXT_PUBLIC_ELYSIUM_RPC_URL ??
          "",
      ) ?? getChainRpcUrl(chainId),
    maxPerWallet: 1,
    maxSupply: 0,
    mintPrice: "0",
    mintMethod: "auto",
    seaDropAddress: "",
    feeRecipient: "",
    title: "Elyziuma",
    tagline: "The first collection minted on Elysium.",
    description:
      "A limited collection from Elyziuma, minted directly on Elysium. Connect a wallet, choose your quantity, and mint while the drop is live.",
    coverImage: "",
    websiteUrl: "",
    twitterUrl: "https://x.com/Elyziumaa",
    discordUrl: "",
  };
}

type NormalizeOptions = {
  strict?: boolean;
};

function validHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeRpcUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed.length > 500 || !validHttpUrl(trimmed)) return null;
  return trimmed;
}

function validImageUrl(value: string) {
  if (value.startsWith("ipfs://")) return value.length > 7;
  if (value.startsWith("ar://")) return value.length > 5;
  return validHttpUrl(value);
}

function textField(
  input: Record<string, unknown>,
  key: keyof LaunchpadConfig,
  fallback: string,
  maxLength: number,
  errors: string[],
  options: { url?: boolean; image?: boolean; optional?: boolean } = {},
) {
  const raw = input[key];
  if (raw === undefined) return fallback;
  if (typeof raw !== "string") {
    errors.push(`${key} must be text.`);
    return fallback;
  }

  const value = raw.trim();
  if (!value) return options.optional === false ? fallback : "";

  if (value.length > maxLength) {
    errors.push(`${key} must be ${maxLength} characters or fewer.`);
    return fallback;
  }

  if (options.url && !validHttpUrl(value)) {
    errors.push(`${key} must be a valid http(s) URL.`);
    return fallback;
  }

  if (options.image && !validImageUrl(value)) {
    errors.push(`${key} must be an http(s), ipfs://, or ar:// URL.`);
    return fallback;
  }

  return value;
}

function addressField(
  input: Record<string, unknown>,
  key: keyof LaunchpadConfig,
  fallback: string,
  errors: string[],
  optional = true,
) {
  const raw = input[key];
  if (raw === undefined) return fallback;
  if (typeof raw !== "string") {
    errors.push(`${key} must be an address.`);
    return fallback;
  }

  const value = raw.trim();
  if (!value) {
    if (!optional) errors.push(`${key} is required.`);
    return "";
  }

  if (!isAddress(value)) {
    errors.push(`${key} is not a valid EVM address.`);
    return fallback;
  }

  return getAddress(value);
}

/** Unix seconds, or 0 to clear the schedule. */
function startAtField(
  input: Record<string, unknown>,
  fallback: number,
  errors: string[],
) {
  const raw = input.startAt;
  if (raw === undefined) return fallback;

  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : Number.NaN;

  // 0 clears the schedule. The upper bound keeps the value inside a safe
  // integer and rejects accidental milliseconds-based timestamps.
  if (!Number.isSafeInteger(value) || value < 0 || value > 4_102_444_800) {
    errors.push("startAt must be a unix timestamp in seconds.");
    return fallback;
  }

  return value;
}

function integerField(
  input: Record<string, unknown>,
  key: keyof LaunchpadConfig,
  fallback: number,
  min: number,
  max: number,
  errors: string[],
) {
  const raw = input[key];
  if (raw === undefined) return fallback;
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : Number.NaN;

  if (!Number.isInteger(value) || value < min || value > max) {
    errors.push(`${key} must be a whole number between ${min} and ${max}.`);
    return fallback;
  }

  return value;
}

export function normalizeLaunchpadConfig(
  value: unknown,
  options: NormalizeOptions = {},
): LaunchpadConfig {
  const defaults = getDefaultLaunchpadConfig();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (options.strict) {
      throw new LaunchpadConfigError("Launchpad settings must be an object.");
    }
    return defaults;
  }

  const input = value as Record<string, unknown>;
  const errors: string[] = [];

  const enabled =
    typeof input.enabled === "boolean" ? input.enabled : defaults.enabled;

  const mintBalanceCheck =
    typeof input.mintBalanceCheck === "boolean"
      ? input.mintBalanceCheck
      : defaults.mintBalanceCheck;

  const chainIdCandidate =
    typeof input.chainId === "number"
      ? input.chainId
      : typeof input.chainId === "string" && input.chainId.trim()
        ? Number(input.chainId)
        : defaults.chainId;

  if (!isElysiumChainId(chainIdCandidate)) {
    errors.push(`chainId must be one of ${ELYSIUM_CHAIN_IDS.join(", ")}.`);
  }
  const chainId = isElysiumChainId(chainIdCandidate)
    ? chainIdCandidate
    : defaults.chainId;

  if (input.rpcUrl !== undefined && typeof input.rpcUrl !== "string") {
    errors.push("rpcUrl must be a valid http(s) URL.");
  }
  const rpcValue =
    typeof input.rpcUrl === "string" ? input.rpcUrl : defaults.rpcUrl;
  const rpcUrl =
    normalizeRpcUrl(rpcValue) ??
    (() => {
      errors.push("rpcUrl must be a valid http(s) URL.");
      return defaults.rpcUrl;
    })();

  const mintPriceRaw =
    typeof input.mintPrice === "string"
      ? input.mintPrice.trim()
      : typeof input.mintPrice === "number"
        ? String(input.mintPrice)
        : defaults.mintPrice;

  let mintPrice = defaults.mintPrice;
  try {
    if (
      /^\d{1,9}(\.\d{1,18})?$/.test(mintPriceRaw) &&
      parseUnits(mintPriceRaw, 18) >= 0n
    ) {
      mintPrice = mintPriceRaw.replace(/^0+(?=\d)/, "");
    } else {
      errors.push("mintPrice must be a non-negative HYPE amount.");
    }
  } catch {
    errors.push("mintPrice must be a non-negative HYPE amount.");
  }

  const mintMethodRaw =
    typeof input.mintMethod === "string" ? input.mintMethod : defaults.mintMethod;
  const mintMethod = MINT_METHOD_IDS.has(mintMethodRaw)
    ? (mintMethodRaw as MintMethod)
    : (() => {
        errors.push("mintMethod is not supported.");
        return defaults.mintMethod;
      })();

  const config: LaunchpadConfig = {
    enabled,
    startAt: startAtField(input, defaults.startAt, errors),
    mintBalanceCheck,
    chainId,
    collectionAddress: addressField(
      input,
      "collectionAddress",
      defaults.collectionAddress,
      errors,
    ),
    rpcUrl,
    maxPerWallet: integerField(
      input,
      "maxPerWallet",
      defaults.maxPerWallet,
      1,
      5_000,
      errors,
    ),
    maxSupply: integerField(
      input,
      "maxSupply",
      defaults.maxSupply,
      0,
      100_000_000,
      errors,
    ),
    mintPrice,
    mintMethod,
    seaDropAddress: addressField(
      input,
      "seaDropAddress",
      defaults.seaDropAddress,
      errors,
    ),
    feeRecipient: addressField(
      input,
      "feeRecipient",
      defaults.feeRecipient,
      errors,
    ),
    title: textField(input, "title", defaults.title, 80, errors, {
      optional: false,
    }),
    tagline: textField(input, "tagline", defaults.tagline, 160, errors, {
      optional: false,
    }),
    description: textField(
      input,
      "description",
      defaults.description,
      4_000,
      errors,
      { optional: false },
    ),
    coverImage: textField(
      input,
      "coverImage",
      defaults.coverImage,
      500,
      errors,
      { image: true },
    ),
    websiteUrl: textField(input, "websiteUrl", defaults.websiteUrl, 500, errors, {
      url: true,
    }),
    twitterUrl: textField(
      input,
      "twitterUrl",
      defaults.twitterUrl,
      500,
      errors,
      { url: true },
    ),
    discordUrl: textField(input, "discordUrl", defaults.discordUrl, 500, errors, {
      url: true,
    }),
  };

  if (errors.length > 0 && options.strict) {
    throw new LaunchpadConfigError(errors[0], errors);
  }

  return config;
}

export function getLaunchpadChainInfo(chainId: number): LaunchpadChainInfo {
  const chain = getElysiumChain(chainId);

  return {
    id: chain.id,
    name: chain.name,
    nativeCurrency: { ...chain.nativeCurrency },
    explorerUrl: getChainExplorerUrl(chain.id),
  };
}

export function toPublicLaunchpadConfig(
  config: LaunchpadConfig,
): PublicLaunchpadConfig {
  return {
    ...config,
    chain: getLaunchpadChainInfo(config.chainId),
    configured: Boolean(config.collectionAddress),
  };
}

export function resolveImageUrl(value: string) {
  if (!value) return "";
  if (value.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${value.slice("ipfs://".length).replace(/^ipfs\//, "")}`;
  }
  if (value.startsWith("ar://")) {
    return `https://arweave.net/${value.slice("ar://".length)}`;
  }
  return value;
}
