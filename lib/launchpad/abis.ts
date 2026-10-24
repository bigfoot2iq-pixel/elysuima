import { parseAbi } from "viem";

export const launchpadReadAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function owner() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
  "function getMintStats(address minter) view returns (uint256 minterNumMinted, uint256 currentTotalSupply, uint256 maxSupply)",
  "function getAllowedSeaDrop() view returns (address[])",
  "function contractURI() view returns (string)",
  "function mintSeaDrop(address minter, uint256 quantity)",
]);

/**
 * ERC-721 transfer event, used to read the token IDs a mint produced from the
 * confirmed transaction receipt.
 */
export const erc721TransferAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

export const launchpadMintAbi = parseAbi([
  "function mint(address to, uint256 quantity) payable",
  "function mint(uint256 quantity) payable",
  "function publicMint(uint256 quantity) payable",
  "function mintPublic(uint256 quantity) payable",
  "function claim(address to, uint256 quantity) payable",
  "function mintTo(address to) payable",
  "function safeMint(address to) payable",
]);

/**
 * Reads the Elyziuma collection contract, which keeps its public phase
 * on-chain. Every entry is optional: a collection that does not expose it
 * simply fails the read and the launchpad falls back to the saved settings.
 */
export const elyziumaNftReadAbi = parseAbi([
  "function publicPrice() view returns (uint256)",
  "function publicMintOpen() view returns (bool)",
  "function minted(address wallet) view returns (uint256)",
  "function MAX_PER_WALLET() view returns (uint256)",
]);

export const seaDropAbi = parseAbi([
  "function mintPublic(address nftContract, address feeRecipient, address minterIfNotPayer, uint256 quantity) payable",
  "function getPublicDrop(address nftContract) view returns ((uint80 mintPrice, uint48 startTime, uint48 endTime, uint16 maxTotalMintableByWallet, uint16 feeBps, bool restrictFeeRecipients))",
  "function getAllowedFeeRecipients(address nftContract) view returns (address[])",
  "function getCreatorPayoutAddress(address nftContract) view returns (address)",
]);
