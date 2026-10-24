import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  isHex,
  verifyMessage,
  type Address,
} from "viem";
import { buildAdminMessage } from "@/lib/launchpad/auth-message";
import { hashLaunchpadPayload } from "@/lib/launchpad/stable";
import type {
  LaunchpadAdminAction,
  LaunchpadAdminSource,
  LaunchpadAdminStatus,
} from "@/lib/launchpad/types";
import { CLAIM_ADDRESS, IS_CONFIGURED } from "@/lib/config";
import { claimAbi } from "@/lib/abis";
import { launchpadReadAbi } from "@/lib/launchpad/abis";
import {
  ELYSIUM_CHAIN_IDS,
  getChainRpcUrl,
} from "@/lib/chains";
import { getElysiumClient } from "./elysium";
import { getLaunchpadConfig } from "./launchpad-config";

const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;
const SIGNATURE_MEMORY_MS = 10 * 60 * 1000;

export class LaunchpadAuthError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 401) {
    super(message);
    this.name = "LaunchpadAuthError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Wallets that are always allowed to administer the launchpad. The on-chain
 * checks below are the primary gate; this is the escape hatch for the case
 * where the collection address is cleared and no collection can be read.
 */
function readAdminAllowlist() {
  const raw = process.env.LAUNCHPAD_ADMIN_ADDRESSES?.trim();
  if (!raw) return new Set<string>();

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => isAddress(entry))
      .map((entry) => getAddress(entry).toLowerCase()),
  );
}

async function readCollectionOwner(
  address: Address | undefined,
  rpcUrl: string,
) {
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return undefined;
  }

  try {
    const client = createPublicClient({
      transport: http(rpcUrl, { timeout: 8_000, retryCount: 1 }),
    });
    return await client.readContract({
      address,
      abi: launchpadReadAbi,
      functionName: "owner",
    });
  } catch {
    return undefined;
  }
}

/**
 * The owner of the configured collection, looked up on every Elysium network.
 *
 * The launchpad can be pointed at a chain where the collection has not been
 * deployed yet, so the ownership check has to look past the active chain.
 * Otherwise switching networks would lock the owner out of the console.
 */
async function readCollectionOwners(
  address: Address | undefined,
  activeChainId: number,
  activeRpcUrl: string,
) {
  const owners = await Promise.all(
    ELYSIUM_CHAIN_IDS.map(async (chainId) => {
      const rpcUrl =
        chainId === activeChainId ? activeRpcUrl : getChainRpcUrl(chainId);
      return readCollectionOwner(address, rpcUrl);
    }),
  );

  return owners.filter((owner): owner is Address => Boolean(owner));
}

async function readClaimOwner(address: Address | undefined) {
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return undefined;
  }

  try {
    const client = await getElysiumClient();
    return await client.readContract({
      address,
      abi: claimAbi,
      functionName: "owner",
    });
  } catch {
    return undefined;
  }
}

export async function checkLaunchpadAdmin(
  address: string,
  options: { collectionAddress?: string } = {},
): Promise<LaunchpadAdminStatus> {
  if (!isAddress(address)) {
    return { authorized: false, sources: [] };
  }

  const wallet = getAddress(address);
  const config = await getLaunchpadConfig();
  const sources: LaunchpadAdminSource[] = [];

  const currentCollection =
    config.collectionAddress && isAddress(config.collectionAddress)
      ? getAddress(config.collectionAddress)
      : undefined;
  const candidateCollection =
    options.collectionAddress && isAddress(options.collectionAddress)
      ? getAddress(options.collectionAddress)
      : undefined;

  const claimCandidate =
    IS_CONFIGURED && isAddress(CLAIM_ADDRESS)
      ? getAddress(CLAIM_ADDRESS)
      : undefined;

  const [collectionOwners, candidateOwners, claimOwner] = await Promise.all([
    readCollectionOwners(
      currentCollection,
      config.chainId,
      config.rpcUrl,
    ),
    candidateCollection && candidateCollection !== currentCollection
      ? readCollectionOwners(
          candidateCollection,
          config.chainId,
          config.rpcUrl,
        )
      : Promise.resolve([]),
    readClaimOwner(claimCandidate),
  ]);

  const collectionOwner = collectionOwners[0];

  const ownsCollection =
    collectionOwners.some((owner) => owner === wallet) ||
    candidateOwners.some((owner) => owner === wallet);

  if (ownsCollection) {
    sources.push("collection-owner");
  }
  if (claimOwner === wallet) sources.push("claim-owner");
  if (readAdminAllowlist().has(wallet.toLowerCase())) {
    sources.push("allowlist");
  }

  return {
    authorized: sources.length > 0,
    sources,
    collectionOwner,
    claimOwner,
  };
}

const usedSignatures = new Map<string, number>();

function rememberSignature(signature: string) {
  const now = Date.now();
  for (const [key, expiresAt] of usedSignatures) {
    if (expiresAt <= now) usedSignatures.delete(key);
  }

  const key = signature.toLowerCase();
  if (usedSignatures.has(key)) {
    throw new LaunchpadAuthError(
      "SIGNATURE_REUSED",
      "This signature was already used. Sign the request again.",
    );
  }

  usedSignatures.set(key, now + SIGNATURE_MEMORY_MS);
}

export async function verifyLaunchpadAdmin(input: {
  action: LaunchpadAdminAction;
  address: string;
  timestamp: number;
  signature: string;
  payload: unknown;
  /** Candidate collection to check for read-only inspection. */
  collectionAddress?: string;
}): Promise<{ address: Address; status: LaunchpadAdminStatus }> {
  if (!isAddress(input.address)) {
    throw new LaunchpadAuthError(
      "INVALID_ADDRESS",
      "Connect a valid admin wallet.",
      400,
    );
  }

  if (
    !Number.isSafeInteger(input.timestamp) ||
    Math.abs(Math.floor(Date.now() / 1000) - input.timestamp) >
      MAX_SIGNATURE_AGE_SECONDS
  ) {
    throw new LaunchpadAuthError(
      "STALE_SIGNATURE",
      "The signature timestamp is stale. Try again.",
    );
  }

  if (!isHex(input.signature)) {
    throw new LaunchpadAuthError(
      "INVALID_SIGNATURE",
      "The wallet signature is missing or malformed.",
    );
  }

  const payloadHash = hashLaunchpadPayload(input.payload);
  const address = getAddress(input.address);
  const message = buildAdminMessage({
    action: input.action,
    address,
    timestamp: input.timestamp,
    payloadHash,
  });

  let valid = false;
  try {
    valid = await verifyMessage({
      address,
      message,
      signature: input.signature,
    });
  } catch {
    valid = false;
  }

  if (!valid) {
    throw new LaunchpadAuthError(
      "INVALID_SIGNATURE",
      "The wallet signature did not match this request.",
    );
  }

  const status = await checkLaunchpadAdmin(address, {
    collectionAddress: input.collectionAddress,
  });

  if (!status.authorized) {
    throw new LaunchpadAuthError(
      "NOT_AUTHORIZED",
      "This wallet is not an authorized launchpad admin.",
      403,
    );
  }

  rememberSignature(input.signature);

  return { address, status };
}
