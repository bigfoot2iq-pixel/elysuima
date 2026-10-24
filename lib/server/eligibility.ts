import {
  createPublicClient,
  formatEther,
  http,
  isAddress,
  parseUnits,
  type Address,
  type PublicClient,
} from "viem";
import { ELIGIBILITY_CHAINS } from "@/lib/chains";

export type EligibilityChainResult = {
  key: string;
  name: string;
  shortName: string;
  chainId: number;
  nativeSymbol: string;
  color: string;
  explorer: string;
  balance: string;
  balanceFormatted: string;
  ok: boolean;
  error: string | null;
};

export type EligibilityResult = {
  address: Address;
  eligible: boolean;
  thresholdWei: string;
  thresholdFormatted: string;
  chains: EligibilityChainResult[];
  bestChain: string | null;
  allUnavailable: boolean;
  checkedAt: number;
};

const RPC_FALLBACKS: Record<string, string[]> = {
  ethereum: [
    process.env.ETH_RPC_URL,
    "https://ethereum-rpc.publicnode.com",
    "https://cloudflare-eth.com",
    "https://eth.drpc.org",
  ].filter((value): value is string => Boolean(value)),
  hyperevm: [
    process.env.HYPEREVM_RPC_URL,
    "https://rpc.hyperliquid.xyz/evm",
  ].filter((value): value is string => Boolean(value)),
  base: [
    process.env.BASE_RPC_URL,
    "https://mainnet.base.org",
    "https://base-rpc.publicnode.com",
  ].filter((value): value is string => Boolean(value)),
  ink: [
    process.env.INK_RPC_URL,
    "https://rpc-gel.inkonchain.com",
    "https://rpc-qnd.inkonchain.com",
  ].filter((value): value is string => Boolean(value)),
};

const clients = new Map<string, PublicClient>();

function clientFor(url: string) {
  const existing = clients.get(url);
  if (existing) return existing;

  const client = createPublicClient({
    transport: http(url, {
      timeout: 4_500,
      retryCount: 0,
    }),
  });
  clients.set(url, client);
  return client;
}

function thresholdWei() {
  const raw = process.env.ELIGIBILITY_THRESHOLD_WEI;
  if (raw) {
    try {
      return BigInt(raw);
    } catch {
      // Fall through to the documented 0.001 native-token threshold.
    }
  }
  return 10n ** 15n;
}

/**
 * HyperCore spot balances are not exposed over JSON-RPC. The official info API
 * returns the wallet's spot balances, including HYPE, as decimal strings.
 */
async function hyperliquidBalance(address: Address): Promise<bigint> {
  const response = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "spotClearinghouseState", user: address }),
    signal: AbortSignal.timeout(4_500),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Hyperliquid info API returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    balances?: Array<{ coin?: string; total?: string }>;
  };
  if (!Array.isArray(payload.balances)) {
    throw new Error("Unexpected Hyperliquid info response");
  }

  const total = payload.balances.find((entry) => entry.coin === "HYPE")?.total;
  return parseUnits(total ?? "0", 18);
}

async function balanceOnChain(chainKey: string, address: Address) {
  if (chainKey === "hyperliquid") return hyperliquidBalance(address);

  const urls = RPC_FALLBACKS[chainKey] ?? [];
  if (urls.length === 0) throw new Error("No RPC configured");

  let lastError: unknown;

  for (const url of urls) {
    try {
      const balance = await clientFor(url).getBalance({ address });
      return balance;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("RPC unavailable");
}

async function runChecks(address: Address): Promise<EligibilityResult> {
  const threshold = thresholdWei();

  const results = await Promise.allSettled(
    ELIGIBILITY_CHAINS.map((chain) => balanceOnChain(chain.key, address)),
  );

  const chains = ELIGIBILITY_CHAINS.map((chain, index) => {
    const result = results[index];
    const meta = {
      key: chain.key,
      name: chain.name,
      shortName: chain.shortName,
      chainId: chain.chainId,
      nativeSymbol: chain.nativeSymbol,
      color: chain.color,
      explorer: chain.explorer,
    };

    if (result.status === "rejected") {
      return {
        ...meta,
        balance: "0",
        balanceFormatted: "0",
        ok: false,
        error: "Balance check unavailable",
      };
    }

    const balance = result.value;
    return {
      ...meta,
      balance: balance.toString(),
      balanceFormatted: formatEther(balance),
      ok: balance >= threshold,
      error: null,
    };
  });

  const eligible = chains.some((chain) => chain.ok);
  const bestChain = chains.find((chain) => chain.ok)?.name ?? null;
  const allUnavailable = chains.every((chain) => chain.error !== null);

  return {
    address,
    eligible,
    thresholdWei: threshold.toString(),
    thresholdFormatted: formatEther(threshold),
    chains,
    bestChain,
    allUnavailable,
    checkedAt: Date.now(),
  };
}

type CacheEntry = {
  expiresAt: number;
  data: EligibilityResult;
};

const cache = new Map<string, CacheEntry>();
const CACHE_MS = 30_000;
const CACHE_LIMIT = 1_000;

export async function checkEligibility(
  address: Address,
  options: { bypassCache?: boolean } = {},
): Promise<EligibilityResult> {
  if (!isAddress(address)) throw new Error("Invalid address");

  const key = address.toLowerCase();

  if (!options.bypassCache) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
  }

  const data = await runChecks(address);

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
