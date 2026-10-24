import { explorerAddressFor, explorerTxFor, getDefaultChainId } from "@/lib/chains";

/**
 * Fallback chain for the ElyziumaNFT collection. The owner console follows the
 * active launchpad network when it is available, and falls back to this.
 */
export const COLLECTION_CHAIN_ID = getDefaultChainId();

/** Explorer link for a contract or wallet on the collection chain. */
export function collectionExplorerAddress(address: string, chainId?: number) {
  return explorerAddressFor(chainId ?? COLLECTION_CHAIN_ID, address);
}

/** Explorer link for a transaction on the collection chain. */
export function collectionExplorerTx(hash: string, chainId?: number) {
  return explorerTxFor(chainId ?? COLLECTION_CHAIN_ID, hash);
}
