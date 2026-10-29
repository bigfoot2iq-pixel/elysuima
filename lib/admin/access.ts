import { getAddress, isAddress } from "viem";

/** Cookie that carries the signed owner-console session. */
export const ADMIN_SESSION_COOKIE = "elyziuma_owner_session";

/** How long a signed-in owner console stays unlocked. */
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;

/**
 * How old a freshly signed login message may be. This is intentionally short:
 * the signature is only exchanged for a session once, right after signing.
 */
export const ADMIN_LOGIN_MAX_AGE_SECONDS = 5 * 60;

/**
 * The message signed to unlock private access. It contains every value the
 * server stores in the session cookie, so the cookie cannot be forged or
 * edited without a valid wallet signature.
 */
export function buildAdminSessionMessage(input: {
  address: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}) {
  const address = isAddress(input.address)
    ? getAddress(input.address)
    : input.address;

  return [
    "Elyziuma private access",
    "",
    `Wallet: ${address}`,
    `Issued at: ${new Date(input.issuedAt * 1000).toISOString()}`,
    `Expires at: ${new Date(input.expiresAt * 1000).toISOString()}`,
    `Nonce: ${input.nonce}`,
    "",
    `Signing this message unlocks Elyziuma access in this browser for ${Math.round(
      ADMIN_SESSION_TTL_SECONDS / 3600,
    )} hours.`,
    "It does not send a transaction or approve any token.",
  ].join("\n");
}
