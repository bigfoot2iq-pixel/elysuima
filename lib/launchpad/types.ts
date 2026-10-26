export const SEADROP_ADDRESS =
  "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5" as const;
export const SEADROP_FEE_RECIPIENT =
  "0x0000a26b00c1F0DF003000390027140000fAa719" as const;
export const ERC721_INTERFACE_ID = "0x80ac58cd" as const;
export const ERC1155_INTERFACE_ID = "0xd9b67a26" as const;
export const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

export const MINT_METHODS = [
  {
    id: "auto",
    label: "Auto-detect",
    description:
      "Read the collection and pick the best supported mint function automatically.",
  },
  {
    id: "seadrop",
    label: "OpenSea SeaDrop",
    description:
      "Calls mintPublic on the SeaDrop contract. Use this for OpenSea Studio drops.",
  },
  {
    id: "mint-address-amount",
    label: "mint(address, uint256)",
    description: "The most common public mint: recipient plus quantity.",
  },
  {
    id: "mint-amount",
    label: "mint(uint256)",
    description: "Quantity only. The connected wallet receives the NFT.",
  },
  {
    id: "public-mint-amount",
    label: "publicMint(uint256)",
    description: "Quantity only public mint variant.",
  },
  {
    id: "mint-public-amount",
    label: "mintPublic(uint256)",
    description: "Quantity only public mint variant.",
  },
  {
    id: "claim-address-amount",
    label: "claim(address, uint256)",
    description: "Thirdweb-style claim function.",
  },
  {
    id: "mint-to-address",
    label: "mintTo(address)",
    description: "Mints a single token to the connected wallet.",
  },
  {
    id: "safe-mint-address",
    label: "safeMint(address)",
    description: "Mints a single token to the connected wallet.",
  },
] as const;

export type MintMethod = (typeof MINT_METHODS)[number]["id"];

export type LaunchpadConfig = {
  enabled: boolean;
  /**
   * Unix seconds when the mint opens. While set and in the future the public
   * launchpad's mint button shows a live countdown. 0 means no schedule.
   */
  startAt: number;
  /**
   * Whether the mint panel checks the connected wallet's mainnet ETH/HYPE
   * balance before enabling the mint button. The check reads Hyperliquid,
   * HyperEVM, Ethereum, Base, and Ink, so it still deters bots when the mint
   * itself runs on testnet. This is a launchpad UI guard only; the contract
   * remains the final authority.
   */
  mintBalanceCheck: boolean;
  /** Elysium network the launchpad targets. Switched at runtime. */
  chainId: number;
  collectionAddress: string;
  rpcUrl: string;
  maxPerWallet: number;
  maxSupply: number;
  mintPrice: string;
  mintMethod: MintMethod;
  seaDropAddress: string;
  feeRecipient: string;
  title: string;
  tagline: string;
  description: string;
  coverImage: string;
  websiteUrl: string;
  twitterUrl: string;
  discordUrl: string;
};

export type LaunchpadChainInfo = {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  explorerUrl: string;
};

export type PublicLaunchpadConfig = LaunchpadConfig & {
  chain: LaunchpadChainInfo;
  configured: boolean;
};

export type RpcTest = {
  ok: boolean;
  rpcUrl: string;
  chainId?: number;
  blockNumber?: string;
  latencyMs?: number;
  message?: string;
};

export type DetectedMethod = {
  id: MintMethod;
  label: string;
  signature: string;
  available: boolean;
  source: "collection" | "seadrop";
};

export type SeaDropInfo = {
  address: string;
  mintPrice: string;
  startTime: number;
  endTime: number;
  maxPerWallet: number;
  feeBps: number;
  feeRecipient: string;
  feeRecipients: string[];
  restrictFeeRecipients: boolean;
  creatorPayout?: string;
};

/**
 * On-chain drop configuration for the Elyziuma collection contract. The
 * contract keeps the public phase on-chain, so the launchpad reads the phase,
 * the price, and the limits straight from the contract instead of trusting the
 * saved settings.
 */
export type ElyziumaDropInfo = {
  /** Public phase price, in wei. */
  publicPrice: string;
  /** Whether the owner has opened the public phase. */
  publicMintOpen: boolean;
  /** Tokens a wallet may mint during the public phase. */
  maxPerWallet: number;
};

export type ContractInspection = {
  ok: boolean;
  rpcUrl: string;
  collectionAddress: string;
  chainId?: number;
  blockNumber?: string;
  latencyMs?: number;
  name?: string;
  symbol?: string;
  owner?: string;
  implementation?: string;
  standard?: "ERC721" | "ERC1155" | "UNKNOWN";
  isErc721?: boolean;
  isErc1155?: boolean;
  totalSupply?: string;
  maxSupply?: string;
  mintedBy?: string;
  detectedMethod?: Exclude<MintMethod, "auto">;
  methods: DetectedMethod[];
  seaDrop?: SeaDropInfo;
  elyziumaDrop?: ElyziumaDropInfo;
  message?: string;
};

export type LaunchpadAdminAction = "update-launchpad" | "inspect-contract";

export type LaunchpadAdminSource =
  | "collection-owner"
  | "claim-owner"
  | "allowlist";

export type LaunchpadAdminStatus = {
  authorized: boolean;
  sources: LaunchpadAdminSource[];
  collectionOwner?: string;
  claimOwner?: string;
};
