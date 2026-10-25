/**
 * CID of the pinned Elyziuma artwork folder. It contains `1.png` through
 * `2222.png`, one image per token.
 */
export const COLLECTION_ART_CID =
  "bafybeihmdxxqsfgznw2rsh5eles7jvtnhrk2522eyrd3udqidko4qwzmvm";

/**
 * Public gateway URL for a token's artwork. `ipfs://` is not a browser scheme,
 * so the UI needs the gateway form to render the image.
 */
export function collectionImageUrl(tokenId: bigint | number) {
  const id = typeof tokenId === "bigint" ? tokenId.toString() : String(tokenId);
  return `https://gateway.pinata.cloud/ipfs/${COLLECTION_ART_CID}/${id}.png`;
}
