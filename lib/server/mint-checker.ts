import type { Address } from "viem";
import type {
  MintEligibilityResponse,
  MintEligibilityTier,
} from "@/lib/mint-eligibility";

/**
 * The public Google Apps Script web app that reads the GTD and FCFS sheets.
 * Override it in the environment if the deployment URL changes.
 */
const DEFAULT_API_URL =
  "https://script.google.com/macros/s/AKfycbykyRMWzoVQM8HScOK1x9ZxFUwWUqxWOy61P1X51gpe3AnkaOYzxanxNbJ6BJMpB6C2zQ/exec";

const API_URL = process.env.MINT_CHECKER_API_URL?.trim() || DEFAULT_API_URL;
const API_KEY = process.env.MINT_CHECKER_API_KEY?.trim() ?? "";

function readCacheMs() {
  const raw = Number(process.env.MINT_CHECKER_CACHE_SECONDS ?? 60);
  if (!Number.isFinite(raw)) return 60_000;
  return Math.min(300_000, Math.max(15_000, raw * 1_000));
}

const CACHE_MS = readCacheMs();
const CACHE_LIMIT = 500;
const REQUEST_TIMEOUT_MS = 25_000;

type CacheEntry = {
  expiresAt: number;
  data: MintEligibilityResponse;
};

const cache = new Map<string, CacheEntry>();

export class MintCheckerAddressError extends Error {}
export class MintCheckerUnavailableError extends Error {}

function tierFor(gtd: boolean, fcfs: boolean): MintEligibilityTier {
  if (gtd && fcfs) return "both";
  if (gtd) return "gtd";
  if (fcfs) return "fcfs";
  return "none";
}

function parseResponse(
  payload: unknown,
  address: Address,
): MintEligibilityResponse | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  if (record.ok !== true) return null;

  let gtd = typeof record.gtd === "boolean" ? record.gtd : null;
  let fcfs = typeof record.fcfs === "boolean" ? record.fcfs : null;
  const rawTier =
    typeof record.tier === "string" ? record.tier.toLowerCase() : "";

  if ((gtd === null || fcfs === null) && rawTier) {
    switch (rawTier) {
      case "gtd":
        gtd = true;
        fcfs = false;
        break;
      case "fcfs":
        gtd = false;
        fcfs = true;
        break;
      case "both":
        gtd = true;
        fcfs = true;
        break;
      case "none":
        gtd = false;
        fcfs = false;
        break;
      default:
        return null;
    }
  }

  if (gtd === null || fcfs === null) return null;

  return {
    address: address.toLowerCase(),
    gtd,
    fcfs,
    tier: tierFor(gtd, fcfs),
    checkedAt: Date.now(),
  };
}

async function fetchFromAppsScript(address: Address): Promise<unknown> {
  const url = new URL(API_URL);
  url.searchParams.set("address", address.toLowerCase());
  if (API_KEY) url.searchParams.set("key", API_KEY);

  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      accept: "application/json",
      "user-agent": "ElyziumaMintChecker/1.0",
    },
  });

  const text = await response.text();

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new MintCheckerUnavailableError(
      "The allowlist service returned an unexpected response.",
    );
  }

  if (!response.ok) {
    throw new MintCheckerUnavailableError(
      `The allowlist service returned ${response.status}.`,
    );
  }

  return payload;
}

async function runCheck(address: Address): Promise<MintEligibilityResponse> {
  let lastError: unknown;

  // Apps Script can be slow on a cold start and occasionally drops the first
  // connection. One retry is enough to cover that without multiplying the
  // request time for a genuinely unavailable deployment.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const payload = await fetchFromAppsScript(address);
      const record = payload as { ok?: unknown; error?: unknown } | null;

      if (record && record.ok === false) {
        const code = typeof record.error === "string" ? record.error : "";

        if (code === "invalid_address") {
          throw new MintCheckerAddressError("Enter a valid EVM address.");
        }

        if (code === "forbidden") {
          throw new MintCheckerUnavailableError(
            "The allowlist service rejected the request.",
          );
        }

        throw new MintCheckerUnavailableError(
          "The allowlist service could not complete the check.",
        );
      }

      const parsed = parseResponse(payload, address);
      if (!parsed) {
        throw new MintCheckerUnavailableError(
          "The allowlist service returned an unexpected response.",
        );
      }

      return parsed;
    } catch (error) {
      if (error instanceof MintCheckerAddressError) throw error;
      lastError = error;

      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError instanceof MintCheckerUnavailableError
    ? lastError
    : new MintCheckerUnavailableError("The allowlist service is unavailable.");
}

export async function checkMintEligibility(
  address: Address,
  options: { bypassCache?: boolean } = {},
): Promise<MintEligibilityResponse> {
  const key = address.toLowerCase();

  if (!options.bypassCache) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
  }

  const data = await runCheck(address);

  if (cache.size >= CACHE_LIMIT) {
    const now = Date.now();
    for (const [entryKey, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(entryKey);
    }
    if (cache.size >= CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
  }

  cache.set(key, { expiresAt: Date.now() + CACHE_MS, data });
  return data;
}
