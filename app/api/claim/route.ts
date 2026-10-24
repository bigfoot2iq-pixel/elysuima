import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { IS_CONFIGURED } from "@/lib/config";
import { elysium } from "@/lib/chains";
import { checkEligibility } from "@/lib/server/eligibility";
import { getClaimState } from "@/lib/server/elysium";
import { checkLaunchpadAdmin } from "@/lib/server/launchpad-auth";
import { getSignerAccount, signClaim } from "@/lib/server/signature";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

const COOLDOWN_SECONDS = 24 * 60 * 60;
const SIGNATURE_TTL_SECONDS = 10 * 60;

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
  const ipLimit = rateLimit(`claim:ip:${ip}`, 20, 60_000);
  const addressLimit = rateLimit(`claim:address:${address.toLowerCase()}`, 10, 60_000);

  if (!ipLimit.ok || !addressLimit.ok) {
    const resetAt = Math.max(ipLimit.resetAt, addressLimit.resetAt);
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Too many claim attempts. Wait a moment and retry.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
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

  let access;
  try {
    access = await checkLaunchpadAdmin(address);
  } catch (error) {
    console.error("claim access check failed", error);
    return NextResponse.json(
      {
        error: "ACCESS_CHECK_FAILED",
        message: "Claim access could not be verified. Please retry.",
      },
      { status: 503 },
    );
  }

  if (!access.authorized) {
    return NextResponse.json(
      {
        error: "NOT_AUTHORIZED",
        message:
          "The daily claim is limited to the collection owner and admins for now.",
      },
      { status: 403 },
    );
  }

  const signer = getSignerAccount();
  if (!signer) {
    return NextResponse.json(
      {
        error: "SIGNER_MISCONFIGURED",
        message: "The claim signer is not configured on the server.",
      },
      { status: 503 },
    );
  }

  try {
    const eligibility = await checkEligibility(address, { bypassCache: true });

    if (eligibility.allUnavailable) {
      return NextResponse.json(
        {
          error: "VERIFICATION_UNAVAILABLE",
          message: "We couldn't reach the balance networks. Please retry.",
          chains: eligibility.chains,
        },
        { status: 503 },
      );
    }

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: "NOT_ELIGIBLE",
          message:
            "This wallet does not hold 0.001 ETH or HYPE on a supported chain.",
          thresholdWei: eligibility.thresholdWei,
          chains: eligibility.chains,
        },
        { status: 403 },
      );
    }

    const state = await getClaimState(address);

    if (state.signer.toLowerCase() !== signer.address.toLowerCase()) {
      return NextResponse.json(
        {
          error: "SIGNER_MISCONFIGURED",
          message: "The server signer does not match the contract signer.",
        },
        { status: 503 },
      );
    }

    if (state.paused) {
      return NextResponse.json(
        {
          error: "PAUSED",
          message: "Claims are paused by the owner.",
        },
        { status: 409 },
      );
    }

    if (state.dailyAmount === 0n || state.faucetBalance === 0n) {
      return NextResponse.json(
        {
          error: "FAUCET_EMPTY",
          message: "The faucet is being refilled. Try again soon.",
        },
        { status: 503 },
      );
    }

    const nextClaimAt = Number(state.lastClaim + BigInt(COOLDOWN_SECONDS));
    if (state.lastClaim !== 0n && state.chainTime < nextClaimAt) {
      return NextResponse.json(
        {
          error: "COOLDOWN",
          message: "You already claimed in the last 24 hours.",
          nextClaimAt,
          chainTime: state.chainTime,
        },
        { status: 429 },
      );
    }

    const deadline = state.chainTime + SIGNATURE_TTL_SECONDS;
    const signature = await signClaim({
      wallet: address,
      amount: state.dailyAmount,
      nonce: state.nonce,
      deadline,
    });

    return NextResponse.json(
      {
        amount: state.dailyAmount.toString(),
        nonce: state.nonce.toString(),
        deadline,
        signature,
        chainId: elysium.id,
        claimAddress: process.env.NEXT_PUBLIC_CLAIM_ADDRESS,
        eligibleChain: eligibility.bestChain,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("claim authorization failed", error);
    return NextResponse.json(
      {
        error: "CLAIM_FAILED",
        message: "The claim authorization could not be created. Please retry.",
      },
      { status: 500 },
    );
  }
}
