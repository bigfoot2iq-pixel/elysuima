import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Last-claim timestamps for the in-app HYPE drip.
 *
 * The faucet is a server-side transfer, so the cooldown has to live outside the
 * chain. The launchpad store already supports KV for serverless deployments and
 * a JSON file for self-hosting; this follows the same two backends with its own
 * key, so faucet records never touch the launchpad settings.
 */
type Claims = Record<string, number>;

const CLAIMS_KEY = () =>
  process.env.FAUCET_CLAIMS_KEY?.trim() || "elyziuma:faucet:claims";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

function getClaimsPath() {
  return path.join(process.cwd(), "data", "faucet-claims.json");
}

function readKvCredentials() {
  const url = (
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? ""
  )
    .trim()
    .replace(/\/+$/, "");
  const token = (
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? ""
  ).trim();

  return url && token ? { url, token } : null;
}

function parseClaims(raw: string | null): Claims {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const claims: Claims = {};
    for (const [address, timestamp] of Object.entries(parsed)) {
      if (
        /^0x[0-9a-f]{40}$/.test(address) &&
        typeof timestamp === "number" &&
        Number.isFinite(timestamp) &&
        timestamp > 0
      ) {
        claims[address] = timestamp;
      }
    }
    return claims;
  } catch {
    return {};
  }
}

async function readClaims(): Promise<Claims> {
  const kv = readKvCredentials();

  if (kv) {
    const response = await fetch(
      `${kv.url}/get/${encodeURIComponent(CLAIMS_KEY())}`,
      {
        headers: { Authorization: `Bearer ${kv.token}` },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`The faucet store returned HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as {
      result?: string | null;
      error?: string;
    };
    if (payload.error) throw new Error(payload.error);
    return parseClaims(payload.result ?? null);
  }

  try {
    return parseClaims(await readFile(getClaimsPath(), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function writeClaims(claims: Claims) {
  const cutoff = Date.now() - RETENTION_MS;
  const pruned: Claims = {};
  for (const [address, timestamp] of Object.entries(claims)) {
    if (timestamp >= cutoff) pruned[address] = timestamp;
  }

  const serialized = JSON.stringify(pruned);
  const kv = readKvCredentials();

  if (kv) {
    const response = await fetch(
      `${kv.url}/set/${encodeURIComponent(CLAIMS_KEY())}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kv.token}`,
          "Content-Type": "application/json",
        },
        body: serialized,
      },
    );

    if (!response.ok) {
      throw new Error(`The faucet store returned HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as { error?: string };
    if (payload.error) throw new Error(payload.error);
    return;
  }

  const filePath = getClaimsPath();
  await mkdir(path.dirname(filePath), { recursive: true });

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, serialized, "utf8");

  try {
    await rename(tempPath, filePath);
  } catch {
    // Windows can refuse to replace an open destination. Remove it and retry.
    await rm(filePath, { force: true });
    await rename(tempPath, filePath);
  }
}

export async function getLastFaucetClaim(
  address: string,
): Promise<number | null> {
  const claims = await readClaims();
  return claims[address.toLowerCase()] ?? null;
}

let writeChain: Promise<void> = Promise.resolve();

/** Records a claim, serialized so concurrent drips cannot lose an entry. */
export async function recordFaucetClaim(
  address: string,
  timestamp: number,
): Promise<void> {
  const task = writeChain.then(async () => {
    const claims = await readClaims();
    claims[address.toLowerCase()] = timestamp;
    await writeClaims(claims);
  });

  writeChain = task.then(
    () => undefined,
    () => undefined,
  );
  await task;
}
