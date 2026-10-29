import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { ELIGIBILITY_CHAINS } from "@/lib/chains";
import { checkEligibility } from "@/lib/server/eligibility";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Expected a JSON body." },
      { status: 400 },
    );
  }

  const address =
    typeof body === "object" && body !== null && "address" in body
      ? (body as { address?: unknown }).address
      : undefined;

  if (typeof address !== "string" || !isAddress(address)) {
    return NextResponse.json(
      { error: "INVALID_ADDRESS", message: "Enter a valid EVM address." },
      { status: 400 },
    );
  }

  const rawChains =
    typeof body === "object" && body !== null && "chains" in body
      ? (body as { chains?: unknown }).chains
      : undefined;

  let chainKeys: string[] | undefined;

  if (rawChains !== undefined) {
    if (
      !Array.isArray(rawChains) ||
      rawChains.length === 0 ||
      rawChains.some(
        (key) =>
          typeof key !== "string" ||
          !ELIGIBILITY_CHAINS.some((chain) => chain.key === key),
      )
    ) {
      return NextResponse.json(
        { error: "INVALID_CHAINS", message: "Unknown eligibility chain." },
        { status: 400 },
      );
    }

    chainKeys = [...new Set(rawChains as string[])];
  }

  const ip = getClientIp(request);
  const limit = rateLimit(`eligibility:${ip}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Too many checks. Try again in a moment.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))),
        },
      },
    );
  }

  try {
    const result = await checkEligibility(address, { chainKeys });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("eligibility check failed", error);
    return NextResponse.json(
      {
        error: "CHECK_FAILED",
        message: "We couldn't verify balances right now. Please retry.",
      },
      { status: 500 },
    );
  }
}
