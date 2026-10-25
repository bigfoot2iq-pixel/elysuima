/**
 * CID of the pinned Elyziuma artwork folder. It contains `1.png` through
 * `2222.png`, one image per token.
 */
export const COLLECTION_ART_CID =
  "bafybeihmdxxqsfgznw2rsh5eles7jvtnhrk2522eyrd3udqidko4qwzmvm";

/**
 * CID of the pinned metadata folder. It contains `1.json` through `2222.json`.
 * The JSON files reference the artwork with `ipfs://` URIs, so consumers that
 * cannot resolve IPFS need the HTTP gateway form instead.
 */
export const COLLECTION_METADATA_CID =
  "bafybeidvvcvj5a3kh57bl6mryxf4jmooveamikldxkonhbvuvjtjdeo5ly";

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/** HTTP gateway URL for an `ipfs://` URI, or the original HTTP URL. */
export function ipfsGatewayUrl(uri: unknown) {
  if (typeof uri !== "string") return undefined;
  if (uri.startsWith("ipfs://")) {
    return `${PINATA_GATEWAY}/${uri.slice("ipfs://".length).replace(/^ipfs\//, "")}`;
  }
  return /^https?:\/\//i.test(uri) ? uri : undefined;
}

/**
 * Public gateway URL for a token's artwork. `ipfs://` is not a browser scheme,
 * so the UI needs the gateway form to render the image.
 */
export function collectionImageUrl(tokenId: bigint | number) {
  const id = typeof tokenId === "bigint" ? tokenId.toString() : String(tokenId);
  return `https://gateway.pinata.cloud/ipfs/${COLLECTION_ART_CID}/${id}.png`;
}
