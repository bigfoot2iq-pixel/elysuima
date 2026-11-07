import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { isCheckerAddress } from "@/lib/checker-access";
import {
  checkMintEligibility,
  MintCheckerAddressError,
  MintCheckerUnavailableError,
} from "@/lib/server/mint-checker";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

// The Apps Script cold start can take longer than the default serverless
// limit. A warm endpoint normally answers in a few seconds.
export const maxDuration = 60;

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

  if (
    typeof address !== "string" ||
    !isAddress(address, { strict: false })
  ) {
    return NextResponse.json(
      { error: "INVALID_ADDRESS", message: "Enter a valid EVM address." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);
  const limit = rateLimit(`mint-eligibility:${ip}`, 20, 60_000);

  if (!limit.ok) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Too many checks. Try again in a moment.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000)),
          ),
        },
      },
    );
  }

  if (!isCheckerAddress(address)) {
    return NextResponse.json(
      {
        error: "NOT_AUTHORIZED",
        message: "This wallet does not have access to the checker.",
      },
      { status: 403 },
    );
  }

  try {
    const result = await checkMintEligibility(address);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof MintCheckerAddressError) {
      return NextResponse.json(
        { error: "INVALID_ADDRESS", message: error.message },
        { status: 400 },
      );
    }

    if (error instanceof MintCheckerUnavailableError) {
      console.error("mint eligibility check unavailable", error.message);

      return NextResponse.json(
        {
          error: "CHECK_UNAVAILABLE",
          message:
            "The allowlist is temporarily unavailable. Please retry in a moment.",
        },
        { status: 503 },
      );
    }

    console.error("mint eligibility check failed", error);

    return NextResponse.json(
      {
        error: "CHECK_FAILED",
        message: "We couldn't check this wallet right now. Please retry.",
      },
      { status: 500 },
    );
  }
}
