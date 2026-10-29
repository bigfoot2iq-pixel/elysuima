import { defineChain } from "viem";

/**
 * The Elysium networks this app can target.
 *
 * Elysium Testnet is Kinetiq's Arbitrum Orbit chain that settles to HyperEVM
 * (chain id 99801). Elysium mainnet is chain id 99901.
 *
 * Do NOT use the `elysiumTestnet` export from `viem/chains`: that is Vulcan
 * Forged's unrelated chain with id 1338 and LAVA as its gas token.
 */
export const ELYSIUM_CHAIN_IDS = [99801, 99901] as const;

export type ElysiumChainId = (typeof ELYSIUM_CHAIN_IDS)[number];

/** Network the app falls back to when `NEXT_PUBLIC_ELYSIUM_CHAIN_ID` is unset. */
export const DEFAULT_ELYSIUM_CHAIN_ID: ElysiumChainId = 99801;

export type ElysiumChainInfo = {
  id: ElysiumChainId;
  /** Full name, e.g. "Elysium Testnet". */
  name: string;
  /** Short name for compact UI, e.g. "Testnet". */
  label: string;
  testnet: boolean;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  /** Built-in RPC, used when the admin console has not set one. */
  rpcUrl: string;
  /** Explorer origin, without a path. */
  explorerUrl: string;
  /** Explorer path segment for an address. */
  explorerAddressPath: string;
  /** Explorer path segment for a transaction. */
  explorerTxPath: string;
  /** Canonical Multicall3 deployment, required by viem for `readContracts`. */
  multicall3: `0x${string}`;
};

const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";

export const ELYSIUM_CHAINS: Record<ElysiumChainId, ElysiumChainInfo> = {
  99801: {
    id: 99801,
    name: "Elysium Testnet",
    label: "Testnet",
    testnet: true,
    nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
    rpcUrl: "https://testnet-rpc.elysium.kinetiq.xyz",
    explorerUrl: "https://elysium.kinetiq.xyz/testnet-explorer",
    explorerAddressPath: "address",
    explorerTxPath: "transaction",
    multicall3: MULTICALL3,
  },
  99901: {
    id: 99901,
    name: "Elysium",
    label: "Mainnet",
    testnet: false,
    nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
    rpcUrl: "https://rpc.elyspump.com",
    explorerUrl: "https://scan.elyspump.com",
    explorerAddressPath: "#/address",
    explorerTxPath: "#/tx",
    multicall3: MULTICALL3,
  },
};

export function isElysiumChainId(value: unknown): value is ElysiumChainId {
  return (
    typeof value === "number" &&
    (ELYSIUM_CHAIN_IDS as readonly number[]).includes(value)
  );
}

/**
 * The chain the app targets by default. `NEXT_PUBLIC_ELYSIUM_CHAIN_ID` selects
 * it at build time; the admin console can switch the live chain at runtime.
 */
export function getDefaultChainId(): ElysiumChainId {
  const configured = Number(process.env.NEXT_PUBLIC_ELYSIUM_CHAIN_ID);
  return isElysiumChainId(configured) ? configured : DEFAULT_ELYSIUM_CHAIN_ID;
}

/** Registry entry for a chain id, falling back to the default chain. */
export function getElysiumChain(chainId: number): ElysiumChainInfo {
  return isElysiumChainId(chainId)
    ? ELYSIUM_CHAINS[chainId]
    : ELYSIUM_CHAINS[getDefaultChainId()];
}

/**
 * RPC for a chain. `NEXT_PUBLIC_ELYSIUM_RPC_URL` overrides the default chain
 * only, so the built-in URL of the other chain stays reachable.
 */
export function getChainRpcUrl(chainId: number): string {
  const chain = getElysiumChain(chainId);
  if (chain.id === getDefaultChainId()) {
    const configured = process.env.NEXT_PUBLIC_ELYSIUM_RPC_URL?.trim();
    if (configured) return configured.replace(/\/+$/, "");
  }
  return chain.rpcUrl;
}

/** Explorer origin for a chain, with the same override rule as the RPC. */
export function getChainExplorerUrl(chainId: number): string {
  const chain = getElysiumChain(chainId);
  if (chain.id === getDefaultChainId()) {
    const configured = process.env.NEXT_PUBLIC_ELYSIUM_EXPLORER_URL?.trim();
    if (configured) return configured.replace(/\/+$/, "");
  }
  return chain.explorerUrl;
}

/** Explorer link for a contract or wallet on the given chain. */
export function explorerAddressFor(chainId: number, address: string) {
  const chain = getElysiumChain(chainId);
  return `${getChainExplorerUrl(chain.id)}/${chain.explorerAddressPath}/${address}`;
}

/** Explorer link for a transaction on the given chain. */
export function explorerTxFor(chainId: number, hash: string) {
  const chain = getElysiumChain(chainId);
  return `${getChainExplorerUrl(chain.id)}/${chain.explorerTxPath}/${hash}`;
}

/**
 * The viem chain objects registered with wagmi. Both are always present so the
 * wallet can switch between them when the admin console changes the chain.
 */
export const elysium = defineChain({
  id: 99901,
  name: ELYSIUM_CHAINS[99901].name,
  nativeCurrency: { ...ELYSIUM_CHAINS[99901].nativeCurrency },
  rpcUrls: { default: { http: [getChainRpcUrl(99901)] } },
  contracts: { multicall3: { address: ELYSIUM_CHAINS[99901].multicall3 } },
  blockExplorers: {
    default: {
      name: "ElysScan",
      url: getChainExplorerUrl(99901),
    },
  },
});

export const elysiumTestnet = defineChain({
  id: 99801,
  name: ELYSIUM_CHAINS[99801].name,
  testnet: true,
  nativeCurrency: { ...ELYSIUM_CHAINS[99801].nativeCurrency },
  rpcUrls: { default: { http: [getChainRpcUrl(99801)] } },
  contracts: { multicall3: { address: ELYSIUM_CHAINS[99801].multicall3 } },
  blockExplorers: {
    default: {
      name: "Elysium Testnet Explorer",
      url: getChainExplorerUrl(99801),
    },
  },
});

/** The viem chain object for an Elysium chain id. */
export function getElysiumViemChain(chainId: number) {
  return getElysiumChain(chainId).id === 99801 ? elysiumTestnet : elysium;
}

/**
 * Mainnet chains the eligibility service can read. The claim page uses the
 * narrower `CLAIM_ELIGIBILITY_CHAINS` subset below; the launchpad keeps its own
 * five-chain mint guard and minimums.
 *
 * `minBalance` is the community claim minimum for that chain. It is not used by
 * the launchpad, which applies its own ETH/HYPE minimums.
 */
export const ELIGIBILITY_CHAINS = [
  {
    key: "hyperliquid",
    name: "Hyperliquid",
    shortName: "HYPE",
    chainId: 999,
    nativeSymbol: "HYPE",
    minBalance: "0.01",
    color: "#97FCE4",
    explorer: "https://app.hyperliquid.xyz/explorer",
  },
  {
    key: "hyperevm",
    name: "HyperEVM",
    shortName: "HYPE",
    chainId: 999,
    nativeSymbol: "HYPE",
    minBalance: "0.01",
    color: "#50D2C1",
    explorer: "https://hyperevmscan.io",
  },
  {
    key: "ethereum",
    name: "Ethereum",
    shortName: "ETH",
    chainId: 1,
    nativeSymbol: "ETH",
    minBalance: "0.001",
    color: "#627EEA",
    explorer: "https://etherscan.io",
  },
  {
    key: "base",
    name: "Base",
    shortName: "BASE",
    chainId: 8453,
    nativeSymbol: "ETH",
    minBalance: "0.001",
    color: "#0052FF",
    explorer: "https://basescan.org",
  },
  {
    key: "ink",
    name: "Ink",
    shortName: "INK",
    chainId: 57073,
    nativeSymbol: "ETH",
    minBalance: "0.001",
    color: "#7132F5",
    explorer: "https://explorer.inkonchain.com",
  },
] as const;

/**
 * The claim page only accepts a mainnet balance on these two chains:
 * Ethereum (0.001 ETH) or HyperEVM (0.01 HYPE). Hyperliquid (HyperCore) HYPE
 * does not qualify, and Base and Ink remain available to the launchpad's
 * separate mint guard.
 */
export const CLAIM_ELIGIBILITY_CHAINS = ELIGIBILITY_CHAINS.filter(
  (chain) => chain.key === "ethereum" || chain.key === "hyperevm",
);

export type EligibilityChainKey = (typeof ELIGIBILITY_CHAINS)[number]["key"];
