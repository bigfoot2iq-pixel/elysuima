import type { Address } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const CLAIM_ADDRESS = (process.env.NEXT_PUBLIC_CLAIM_ADDRESS ??
  ZERO_ADDRESS) as Address;
export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ??
  ZERO_ADDRESS) as Address;

export const IS_CONFIGURED =
  CLAIM_ADDRESS.toLowerCase() !== ZERO_ADDRESS &&
  TOKEN_ADDRESS.toLowerCase() !== ZERO_ADDRESS;

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "00000000000000000000000000000000";

export const TOKEN_FALLBACK = {
  name: "Elyziuma",
  symbol: "ELYZ",
  decimals: 18,
} as const;

export const LINKS = {
  faucet: "https://elysium.kinetiq.xyz/testnet-faucet",
  bridge: "https://elysium.kinetiq.xyz/testnet-bridge",
  explorer: "https://elysium.kinetiq.xyz/testnet-explorer",
  docs: "https://elysium.kinetiq.xyz/docs",
  x: "https://x.com/Elyziumaa",
} as const;

export function explorerAddress(address: string) {
  return `${LINKS.explorer}/address/${address}`;
}

export function explorerTx(hash: string) {
  return `${LINKS.explorer}/tx/${hash}`;
}
