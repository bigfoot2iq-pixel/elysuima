import { cookies } from "next/headers";
import {
  getAddress,
  isAddress,
  isHex,
  verifyMessage,
  type Address,
  type Hex,
} from "viem";
import {
  ADMIN_LOGIN_MAX_AGE_SECONDS,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  buildAdminSessionMessage,
} from "@/lib/admin/access";

/**
 * Hard fallback for the wallet that owns the Elyziuma NFT collection. It can
 * be overridden with `ADMIN_OWNER_ADDRESS` when ownership is transferred.
 */
const DEFAULT_ADMIN_OWNER: Address =
  "0xb181FDFe71A0a0f56574D88f22B6BaFD142192F6";

/** Small allowance for a client clock that is slightly ahead. */
const CLOCK_SKEW_SECONDS = 120;

const MAX_NONCE_LENGTH = 128;

export class AdminSessionError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 401) {
    super(message);
    this.name = "AdminSessionError";
    this.code = code;
    this.status = status;
  }
}

export type AdminSession = {
  address: Address;
  expiresAt: number;
};

type AdminSessionRecord = {
  v: 1;
  /** Owner wallet. */
  a: Address;
  /** Issued at, seconds. */
  iat: number;
  /** Expires at, seconds. */
  exp: number;
  /** Random nonce shown in the signed message. */
  n: string;
  /** Wallet signature over the login message. */
  s: Hex;
};

/** The only wallet allowed into `/admin`. */
export function getAdminOwnerAddress(): Address {
  const configured = process.env.ADMIN_OWNER_ADDRESS?.trim();
  if (configured && isAddress(configured)) return getAddress(configured);
  return DEFAULT_ADMIN_OWNER;
}

export function encodeAdminSession(record: AdminSessionRecord) {
  return Buffer.from(JSON.stringify(record), "utf8").toString("base64url");
}

function decodeAdminSession(value: string): AdminSessionRecord | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (
      record.v !== 1 ||
      typeof record.a !== "string" ||
      !isAddress(record.a) ||
      !Number.isSafeInteger(record.iat) ||
      !Number.isSafeInteger(record.exp) ||
      typeof record.n !== "string" ||
      record.n.length === 0 ||
      record.n.length > MAX_NONCE_LENGTH ||
      typeof record.s !== "string" ||
      !isHex(record.s)
    ) {
      return null;
    }

    return {
      v: 1,
      a: getAddress(record.a),
      iat: record.iat as number,
      exp: record.exp as number,
      n: record.n,
      s: record.s,
    };
  } catch {
    return null;
  }
}

async function verifySignature(record: AdminSessionRecord) {
  const message = buildAdminSessionMessage({
    address: record.a,
    issuedAt: record.iat,
    expiresAt: record.exp,
    nonce: record.n,
  });

  try {
    return await verifyMessage({
      address: record.a,
      message,
      signature: record.s,
    });
  } catch {
    return false;
  }
}

async function verifyAdminSessionRecord(
  record: AdminSessionRecord,
  now: number,
): Promise<AdminSession | null> {
  if (record.a !== getAdminOwnerAddress()) return null;
  if (record.exp <= now) return null;
  if (record.iat > now + CLOCK_SKEW_SECONDS) return null;
  if (record.exp - record.iat !== ADMIN_SESSION_TTL_SECONDS) return null;
  if (!(await verifySignature(record))) return null;

  return { address: record.a, expiresAt: record.exp };
}

/** Reads and verifies the owner-console session from the request cookies. */
export async function readAdminSession(): Promise<AdminSession | null> {
  const raw = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const record = decodeAdminSession(raw);
  if (!record) return null;

  return verifyAdminSessionRecord(record, Math.floor(Date.now() / 1000));
}

/**
 * Validates a signed login message and returns the session to persist.
 * Throws `AdminSessionError` when the message is stale, forged, or signed by
 * any wallet other than the configured collection owner.
 */
export async function authenticateAdminLogin(input: {
  address: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
  signature: string;
}): Promise<{ session: AdminSession; record: AdminSessionRecord }> {
  if (!isAddress(input.address)) {
    throw new AdminSessionError(
      "INVALID_ADDRESS",
      "Connect a valid owner wallet.",
      400,
    );
  }

  if (
    !Number.isSafeInteger(input.issuedAt) ||
    !Number.isSafeInteger(input.expiresAt)
  ) {
    throw new AdminSessionError(
      "INVALID_REQUEST",
      "The login timestamps are malformed.",
      400,
    );
  }

  if (
    !input.nonce ||
    input.nonce.length > MAX_NONCE_LENGTH ||
    !isHex(input.signature)
  ) {
    throw new AdminSessionError(
      "INVALID_REQUEST",
      "The login nonce or signature is malformed.",
      400,
    );
  }

  const address = getAddress(input.address);
  const owner = getAdminOwnerAddress();

  if (address !== owner) {
    throw new AdminSessionError(
      "NOT_AUTHORIZED",
      "Only the wallet that owns the collection can unlock this console.",
      403,
    );
  }

  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - input.issuedAt) > ADMIN_LOGIN_MAX_AGE_SECONDS) {
    throw new AdminSessionError(
      "STALE_SIGNATURE",
      "The signature is stale. Sign the message again.",
    );
  }

  if (
    input.expiresAt <= now ||
    input.expiresAt - input.issuedAt !== ADMIN_SESSION_TTL_SECONDS
  ) {
    throw new AdminSessionError(
      "INVALID_REQUEST",
      "The session expiry is not valid.",
      400,
    );
  }

  const record: AdminSessionRecord = {
    v: 1,
    a: address,
    iat: input.issuedAt,
    exp: input.expiresAt,
    n: input.nonce,
    s: input.signature,
  };

  const session = await verifyAdminSessionRecord(record, now);
  if (!session) {
    throw new AdminSessionError(
      "INVALID_SIGNATURE",
      "The wallet signature did not match this login request.",
    );
  }

  return { session, record };
}
