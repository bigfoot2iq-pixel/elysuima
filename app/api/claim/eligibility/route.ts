import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { IS_CONFIGURED } from "@/lib/config";
import { getClaimEligibility } from "@/lib/server/claim-eligibility";
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

  const ip = getClientIp(request);
  const limit = rateLimit(`claim-eligibility:ip:${ip}`, 60, 60_000);

  if (!limit.ok) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Too many eligibility checks. Try again in a moment.",
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

  if (!IS_CONFIGURED) {
    return NextResponse.json(
      {
        error: "NOT_CONFIGURED",
        message: "Claim contracts are not configured yet.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await getClaimEligibility(address);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("claim eligibility failed", error);
    return NextResponse.json(
      {
        error: "ELIGIBILITY_FAILED",
        message: "Claim eligibility could not be read. Please retry.",
      },
      { status: 503 },
    );
  }
}
