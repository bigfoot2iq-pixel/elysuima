import type { Address } from "viem";
import {
  explorerAddressFor,
  explorerTxFor,
  getChainExplorerUrl,
  getDefaultChainId,
} from "@/lib/chains";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const CLAIM_ADDRESS = (process.env.NEXT_PUBLIC_CLAIM_ADDRESS ??
  ZERO_ADDRESS) as Address;
export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ??
  ZERO_ADDRESS) as Address;

/**
 * The chain the daily-claim contracts live on. The launchpad and collection can
 * point at a different Elysium network, so the claim console pins its reads and
 * writes to this chain instead of following the wallet.
 */
export const CLAIM_CHAIN_ID = getDefaultChainId();

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
  bridge: "https://elyspump.com",
  elyspump: "https://elyspump.com/#/",
  boxa: "https://boxa.pro/#/bridge",
  faucet: "https://testnet.elysium.kinetiq.xyz/faucet/",
  testnetFaucet: "https://elysium.kinetiq.xyz/testnet-faucet",
  quicknodeFaucet: "https://faucet.quicknode.com/elysium/testnet",
  explorer: getChainExplorerUrl(getDefaultChainId()),
  docs: "https://elysium.kinetiq.xyz/docs",
  x: "https://x.com/Elyziumaa",
} as const;

export function explorerAddress(address: string) {
  return explorerAddressFor(getDefaultChainId(), address);
}

export function explorerTx(hash: string) {
  return explorerTxFor(getDefaultChainId(), hash);
}
