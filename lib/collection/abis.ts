/**
 * ABI for `ElyziumaNFT` (ERC721A + Ownable + ReentrancyGuard).
 *
 * Kept in sync with `contracts/src/ElyziumaNFT.sol`. Only the surface the
 * owner console needs is listed, plus the custom errors so a reverted
 * transaction can be explained.
 */
export const elyziumaNftAbi = [
  // ---- Reads ---------------------------------------------------------------
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "totalMinted",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "result", type: "uint256" }],
  },
  {
    type: "function",
    name: "maxSupply",
    stateMutability: "pure",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MAX_SUPPLY",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MAX_PER_WALLET",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "publicPrice",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "publicMintOpen",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "minted",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },  {
    type: "function",
    name: "remainingForWallet",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "getMintStats",
    stateMutability: "view",
    inputs: [{ name: "minter", type: "address" }],
    outputs: [
      { name: "minterNumMinted", type: "uint256" },
      { name: "currentTotalSupply", type: "uint256" },
      { name: "maxSupply", type: "uint256" },
    ],
  },

  // ---- Owner writes --------------------------------------------------------
  {
    type: "function",
    name: "setPublicPrice",
    stateMutability: "nonpayable",
    inputs: [{ name: "value", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setPublicMintOpen",
    stateMutability: "nonpayable",
    inputs: [{ name: "value", type: "bool" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setBaseURI",
    stateMutability: "nonpayable",
    inputs: [{ name: "baseURI_", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "ownerMint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "quantity", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "transferOwnership",
    stateMutability: "nonpayable",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "renounceOwnership",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },

  // ---- Events --------------------------------------------------------------
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "previousOwner", type: "address", indexed: true },
      { name: "newOwner", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "PublicMinted",
    inputs: [
      { name: "wallet", type: "address", indexed: true },
      { name: "quantity", type: "uint256", indexed: false },
    ],
  },

  // ---- Errors --------------------------------------------------------------
  { type: "error", name: "PublicClosed", inputs: [] },
  { type: "error", name: "ZeroQuantity", inputs: [] },
  { type: "error", name: "ExceedsWalletCap", inputs: [] },
  { type: "error", name: "ExceedsSupply", inputs: [] },
  { type: "error", name: "WrongPayment", inputs: [] },
  { type: "error", name: "WithdrawFailed", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [{ name: "account", type: "address" }],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [{ name: "owner", type: "address" }],
  },
  {
    type: "error",
    name: "URIQueryForNonexistentToken",
    inputs: [],
  },
] as const;
