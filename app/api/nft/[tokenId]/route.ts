import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";

/**
 * ERC-721 metadata endpoint for the Elyziuma collection.
 *
 * The on-chain contract resolves `tokenURI(tokenId)` to
 * `{baseURI}{tokenId}.json`, so with a base URI of
 * `https://<site>/api/nft/` this route answers `/api/nft/1.json`,
 * `/api/nft/2.json`, and so on. Every token shares the same artwork; only the
 * name and the token-id attribute differ.
 */

/** Hard supply cap, mirrored from `ElyziumaNFT.MAX_SUPPLY`. */
const MAX_SUPPLY = 2222;

/** The collection artwork, served from `public/collection`. */
const IMAGE_PATH = "/collection/elyziuma.jpg";

const DESCRIPTION =
  "Elyziuma is a 2,222-piece collection on Elysium. One artwork, 2,222 holders.";

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

  return NextResponse.json({
    name: `Elyziuma #${id}`,
    description: DESCRIPTION,
    image: `${SITE_URL}${IMAGE_PATH}`,
    external_url: `${SITE_URL}/`,
    attributes: [
      { trait_type: "Token ID", value: id },
      { trait_type: "Collection", value: "Elyziuma" },
      { display_type: "number", trait_type: "Elysium Token ID", value: id },
    ],
  });
}
