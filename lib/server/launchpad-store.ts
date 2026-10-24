import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where the launchpad settings live.
 *
 * Two backends are supported:
 *
 * - `file` — a JSON file on disk. The default, and the right choice for a
 *   self-hosted deployment with a persistent volume.
 * - `kv` — Vercel KV or Upstash Redis over their shared REST API. Serverless
 *   platforms have a read-only filesystem, so the settings have to live
 *   outside the deployment for runtime changes to survive a redeploy.
 */
export type LaunchpadStore = {
  kind: "file" | "kv";
  /** Reads the stored settings, or `null` when nothing has been stored yet. */
  read(): Promise<string | null>;
  /** Persists the settings. */
  write(contents: string): Promise<void>;
};

export function getLaunchpadConfigPath() {
  const configured = process.env.LAUNCHPAD_CONFIG_PATH?.trim();
  if (!configured) return path.join(process.cwd(), "data", "launchpad.json");
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), configured);
}

function createFileStore(filePath: string): LaunchpadStore {
  return {
    kind: "file",
    async read() {
      try {
        return await readFile(filePath, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async write(contents) {
      await mkdir(path.dirname(filePath), { recursive: true });

      const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(tempPath, contents, "utf8");

      try {
        await rename(tempPath, filePath);
      } catch {
        // Windows can refuse to replace an open destination. Remove it and retry.
        await rm(filePath, { force: true });
        await rename(tempPath, filePath);
      }
    },
  };
}

type KvStoreOptions = {
  url: string;
  token: string;
  key: string;
};

/**
 * Vercel KV and Upstash Redis speak the same REST API, so one client covers
 * both. `KV_REST_API_URL`/`KV_REST_API_TOKEN` and
 * `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are read in that order.
 */
function createKvStore({ url, token, key }: KvStoreOptions): LaunchpadStore {
  const base = url.replace(/\/+$/, "");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  return {
    kind: "kv",
    async read() {
      const response = await fetch(`${base}/get/${encodeURIComponent(key)}`, {
        headers,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`The settings store returned HTTP ${response.status}.`);
      }

      const payload = (await response.json()) as {
        result?: string | null;
        error?: string;
      };

      if (payload.error) throw new Error(payload.error);
      return payload.result ?? null;
    },
    async write(contents) {
      const response = await fetch(`${base}/set/${encodeURIComponent(key)}`, {
        method: "POST",
        headers,
        body: contents,
      });

      if (!response.ok) {
        throw new Error(`The settings store returned HTTP ${response.status}.`);
      }

      const payload = (await response.json()) as {
        result?: string;
        error?: string;
      };

      if (payload.error) throw new Error(payload.error);
    },
  };
}

function readKvCredentials() {
  const url = (
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? ""
  ).trim();
  const token = (
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? ""
  ).trim();

  return url && token ? { url, token } : null;
}

/**
 * Picks the backend. `LAUNCHPAD_CONFIG_STORE` forces one; otherwise a KV
 * database is used when its credentials are present, and the file backend is
 * the fallback.
 */
export function getLaunchpadStore(): LaunchpadStore {
  const requested = process.env.LAUNCHPAD_CONFIG_STORE?.trim().toLowerCase();
  const credentials = readKvCredentials();

  if (requested === "kv") {
    if (!credentials) {
      throw new Error(
        "LAUNCHPAD_CONFIG_STORE is 'kv' but KV_REST_API_URL and KV_REST_API_TOKEN are not set.",
      );
    }
    return createKvStore({
      url: credentials.url,
      token: credentials.token,
      key: process.env.LAUNCHPAD_CONFIG_KEY?.trim() || "elyziuma:launchpad",
    });
  }

  if (requested === "file") {
    return createFileStore(getLaunchpadConfigPath());
  }

  if (credentials) {
    return createKvStore({
      url: credentials.url,
      token: credentials.token,
      key: process.env.LAUNCHPAD_CONFIG_KEY?.trim() || "elyziuma:launchpad",
    });
  }

  return createFileStore(getLaunchpadConfigPath());
}
