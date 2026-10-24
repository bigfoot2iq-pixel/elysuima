import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import type { ContractInspection } from "@/lib/launchpad/types";
import { getLaunchpadConfig } from "@/lib/server/launchpad-config";
import { inspectContract } from "@/lib/server/launchpad-inspect";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

type CacheEntry = {
  expiresAt: number;
  inspection: ContractInspection;
};

const CACHE_MS = 30_000;
const CACHE_LIMIT = 200;
const cache = new Map<string, CacheEntry>();

function cached(key: string) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.inspection;
}

function remember(key: string, inspection: ContractInspection) {
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
  cache.set(key, { expiresAt: Date.now() + CACHE_MS, inspection });
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`launchpad-contract:${ip}`, 40, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Too many contract checks. Try again in a moment.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000)),
          ),
        },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const config = await getLaunchpadConfig();
  const requested = searchParams.get("address")?.trim();

  if (requested && !isAddress(requested)) {
    return NextResponse.json(
      {
        error: "INVALID_ADDRESS",
        message: "Enter a valid collection contract address.",
      },
      { status: 400 },
    );
  }

  const address = requested
    ? getAddress(requested)
    : config.collectionAddress || "";

  if (!address) {
    return NextResponse.json(
      {
        error: "NOT_CONFIGURED",
        message: "No NFT collection has been configured yet.",
      },
      { status: 404 },
    );
  }

  const key = [
    config.chainId,
    config.rpcUrl,
    address.toLowerCase(),
    config.seaDropAddress.toLowerCase(),
    config.feeRecipient.toLowerCase(),
  ].join("|");

  let inspection = cached(key);
  if (!inspection) {
    inspection = await inspectContract({
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
      collectionAddress: address,
      seaDropAddress: config.seaDropAddress,
      feeRecipient: config.feeRecipient,
    });
    remember(key, inspection);
  }

  return NextResponse.json(
    { inspection },
    { headers: { "Cache-Control": "no-store" } },
  );
}
