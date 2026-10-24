import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { checkLaunchpadAdmin } from "@/lib/server/launchpad-auth";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

/**
 * Gate for the private claim preview. The claim page is limited to the
 * collection owner and the admin allowlist until it is opened to the public.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`claim-access:${ip}`, 60, 60_000);

  if (!limit.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many access checks. Wait a moment." },
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

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "INVALID_ADDRESS", message: "Connect a valid wallet address." },
      { status: 400 },
    );
  }

  try {
    const admin = await checkLaunchpadAdmin(getAddress(address));

    return NextResponse.json(
      {
        authorized: admin.authorized,
        sources: admin.sources,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("claim access check failed", error);
    return NextResponse.json(
      {
        error: "ACCESS_CHECK_FAILED",
        message: "Claim access could not be verified. Please retry.",
      },
      { status: 500 },
    );
  }
}
