import { NextResponse } from "next/server";
import {
  COLLECTION_METADATA_CID,
  collectionImageUrl,
  ipfsGatewayUrl,
} from "@/lib/collection/art";
import { SITE_URL } from "@/lib/config";

/**
 * ERC-721 metadata endpoint for the Elyziuma collection.
 *
 * The on-chain contract resolves `tokenURI(tokenId)` to
 * `{baseURI}{tokenId}.json`, so with a base URI of
 * `https://<site>/api/nft/` this route answers `/api/nft/1.json`,
 * `/api/nft/2.json`, and so on.
 *
 * The pinned metadata stores artwork as `ipfs://` URIs. Explorers and wallets
 * that cannot resolve IPFS would show a broken image, so the response rewrites
 * the image to a public HTTP gateway URL.
 */

/** Hard supply cap, mirrored from `ElyziumaNFT.MAX_SUPPLY`. */
const MAX_SUPPLY = 2222;

const DESCRIPTION =
  "Elyziuma is a limited collection of 2,222 unique digital collectibles built natively on the Elysium Blockchain.";

const METADATA_GATEWAY = `https://gateway.pinata.cloud/ipfs/${COLLECTION_METADATA_CID}`;

type TokenMetadata = Record<string, unknown> & { image?: string };

/**
 * Parses the `{tokenId}.json` segment the contract builds. Anything that is
 * not a plain integer in range is treated as an unknown token.
 */
function parseTokenId(segment: string): number | null {
  const raw = segment.endsWith(".json")
    ? segment.slice(0, -".json".length)
    : segment;

  if (!/^\d+$/.test(raw)) return null;

  const id = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(id) || id < 1 || id > MAX_SUPPLY) return null;

  return id;
}

function fallbackMetadata(id: number): TokenMetadata {
  return {
    name: `Elyziuma #${id}`,
    description: DESCRIPTION,
    image: collectionImageUrl(id),
    external_url: `${SITE_URL}/`,
    attributes: [
      { trait_type: "Token ID", value: id },
      { trait_type: "Collection", value: "Elyziuma" },
      { display_type: "number", trait_type: "Elysium Token ID", value: id },
    ],
  };
}

/**
 * Reads the pinned metadata and converts its artwork URI to an HTTP gateway
 * URL. The pinned files are immutable, so the response can be cached for a
 * day; the local fallback keeps the endpoint useful if Pinata is unavailable.
 */
async function readMetadata(id: number): Promise<TokenMetadata> {
  const fallback = fallbackMetadata(id);

  try {
    const response = await fetch(`${METADATA_GATEWAY}/${id}.json`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return fallback;

    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return fallback;
    }

    const metadata = data as TokenMetadata;
    return {
      ...fallback,
      ...metadata,
      image: ipfsGatewayUrl(metadata.image) ?? fallback.image,
    };
  } catch {
    return fallback;
  }
}

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/nft/[tokenId]">,
) {
  const { tokenId } = await ctx.params;
  const id = parseTokenId(tokenId);

  if (id === null) {
    return NextResponse.json(
      { error: "UNKNOWN_TOKEN", message: "That token does not exist." },
      { status: 404 },
    );
  }

  const metadata = await readMetadata(id);

  return NextResponse.json(metadata, {
    headers: {
      "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
