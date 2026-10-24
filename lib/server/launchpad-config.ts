import {
  LaunchpadConfigError,
  getDefaultLaunchpadConfig,
  normalizeLaunchpadConfig,
} from "@/lib/launchpad/config";
import type { LaunchpadConfig } from "@/lib/launchpad/types";
import { getLaunchpadConfigPath, getLaunchpadStore } from "./launchpad-store";

export { getLaunchpadConfigPath };

/**
 * How long a read is reused before the store is consulted again. The store
 * can be a remote key-value database, and the settings change rarely.
 */
const CACHE_MS = 5_000;

let cached: { expiresAt: number; config: LaunchpadConfig } | undefined;

function remember(config: LaunchpadConfig) {
  cached = { expiresAt: Date.now() + CACHE_MS, config };
  return config;
}

export async function getLaunchpadConfig(): Promise<LaunchpadConfig> {
  if (cached && cached.expiresAt > Date.now()) return cached.config;

  const store = getLaunchpadStore();
  const raw = await store.read();

  if (raw === null) {
    return remember(getDefaultLaunchpadConfig());
  }

  try {
    return remember(normalizeLaunchpadConfig(JSON.parse(raw)));
  } catch (error) {
    console.warn(
      `Could not parse the launchpad settings from the ${store.kind} store; falling back to defaults.`,
      error,
    );
    return remember(getDefaultLaunchpadConfig());
  }
}

let writeChain: Promise<void> = Promise.resolve();

/**
 * Merge a partial update into the stored settings, validate the result, and
 * persist it. Writes are serialized so concurrent saves cannot interleave.
 */
export async function saveLaunchpadConfig(
  update: unknown,
): Promise<LaunchpadConfig> {
  if (!update || typeof update !== "object" || Array.isArray(update)) {
    throw new LaunchpadConfigError("Launchpad settings must be an object.");
  }

  const current = await getLaunchpadConfig();
  const normalized = normalizeLaunchpadConfig(
    { ...current, ...(update as Record<string, unknown>) },
    { strict: true },
  );

  const store = getLaunchpadStore();
  const payload = `${JSON.stringify(normalized, null, 2)}\n`;

  const task = writeChain.then(
    () => store.write(payload),
    () => store.write(payload),
  );
  writeChain = task.then(
    () => undefined,
    () => undefined,
  );
  await task;

  remember(normalized);
  return normalized;
}
