import { defineChain } from "viem";

export const elysiumTestnet = defineChain({
  id: 99801,
  name: "Elysium Testnet",
  nativeCurrency: {
    name: "HYPE",
    symbol: "HYPE",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ELYSIUM_RPC_URL ??
          "https://testnet-rpc.elysium.kinetiq.xyz",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Elysium Explorer",
      url: "https://elysium.kinetiq.xyz/testnet-explorer",
    },
  },
  testnet: true,
});

export const ELIGIBILITY_CHAINS = [
  {
    key: "ethereum",
    name: "Ethereum",
    shortName: "ETH",
    chainId: 1,
    nativeSymbol: "ETH",
    color: "#8A92B2",
    explorer: "https://etherscan.io",
  },
  {
    key: "abstract",
    name: "Abstract",
    shortName: "ABS",
    chainId: 2741,
    nativeSymbol: "ETH",
    color: "#C7F9FF",
    explorer: "https://abscan.org",
  },
  {
    key: "base",
    name: "Base",
    shortName: "BASE",
    chainId: 8453,
    nativeSymbol: "ETH",
    color: "#0052FF",
    explorer: "https://basescan.org",
  },
  {
    key: "ink",
    name: "Ink",
    shortName: "INK",
    chainId: 57073,
    nativeSymbol: "ETH",
    color: "#7B61FF",
    explorer: "https://explorer.inkonchain.com",
  },
] as const;

export type EligibilityChainKey = (typeof ELIGIBILITY_CHAINS)[number]["key"];
