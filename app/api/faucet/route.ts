import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { explorerTxFor } from "@/lib/chains";
import { FAUCET_CHAIN_ID, LINKS } from "@/lib/config";
import {
  FAUCET_GAS_RESERVE,
  getFaucetAccount,
  getFaucetAmount,
  getFaucetBalance,
  getFaucetCooldownMs,
  getFaucetSummary,
  sendFaucetDrip,
} from "@/lib/server/faucet";
import {
  getLastFaucetClaim,
  recordFaucetClaim,
} from "@/lib/server/faucet-store";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

/**
 * Guards against two requests for the same address racing before the cooldown
 * record is written. The UI already disables the button, but retries and direct
 * requests can still arrive together.
 */
const inFlight = new Set<string>();

export async function GET(request: Request) {
  const addressParam = new URL(request.url).searchParams.get("address");
  const address =
    addressParam && isAddress(addressParam) ? addressParam : undefined;

  const amount = getFaucetAmount();
  const cooldownMs = getFaucetCooldownMs();
  const summary = await getFaucetSummary();

  let lastClaimAt: number | null = null;
  if (address) {
    try {
      lastClaimAt = await getLastFaucetClaim(address);
    } catch (error) {
      console.warn("Could not read the faucet claim record", error);
    }
  }

  return NextResponse.json(
    {
      configured: summary.configured,
      chainId: FAUCET_CHAIN_ID,
      amount: amount.toString(),
      cooldownMs,
      faucetAddress: summary.faucetAddress,
      faucetBalance: summary.faucetBalance,
      lastClaimAt,
      nextClaimAt: lastClaimAt === null ? null : lastClaimAt + cooldownMs,
      officialUrl: LINKS.faucet,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

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
  const ipLimit = rateLimit(`faucet:ip:${ip}`, 8, 60 * 60 * 1_000);
  const addressLimit = rateLimit(
    `faucet:address:${address.toLowerCase()}`,
    3,
    10 * 60 * 1_000,
  );

  if (!ipLimit.ok || !addressLimit.ok) {
    const resetAt = Math.max(ipLimit.resetAt, addressLimit.resetAt);
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Too many faucet attempts. Wait a moment and retry.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((resetAt - Date.now()) / 1_000)),
          ),
        },
      },
    );
  }

  const account = getFaucetAccount();
  if (!account) {
    return NextResponse.json(
      {
        error: "NOT_CONFIGURED",
        message:
          "The one-click faucet is not configured on this deployment yet.",
        officialUrl: LINKS.faucet,
      },
      { status: 503 },
    );
  }

  const amount = getFaucetAmount();
  const cooldownMs = getFaucetCooldownMs();

  let lastClaimAt: number | null;
  try {
    lastClaimAt = await getLastFaucetClaim(address);
  } catch (error) {
    console.error("faucet claim lookup failed", error);
    return NextResponse.json(
      {
        error: "FAUCET_UNAVAILABLE",
        message: "The faucet could not check your last claim. Please retry.",
        officialUrl: LINKS.faucet,
      },
      { status: 503 },
    );
  }

  if (lastClaimAt !== null && lastClaimAt + cooldownMs > Date.now()) {
    return NextResponse.json(
      {
        error: "COOLDOWN",
        message: "This wallet already claimed in the current window.",
        lastClaimAt,
        nextClaimAt: lastClaimAt + cooldownMs,
      },
      { status: 429 },
    );
  }

  let faucetBalance: bigint;
  try {
    faucetBalance = await getFaucetBalance(account.address);
  } catch (error) {
    console.error("faucet balance read failed", error);
    return NextResponse.json(
      {
        error: "FAUCET_UNAVAILABLE",
        message: "The faucet could not read its wallet balance. Please retry.",
        officialUrl: LINKS.faucet,
      },
      { status: 503 },
    );
  }

  if (faucetBalance < amount + FAUCET_GAS_RESERVE) {
    return NextResponse.json(
      {
        error: "FAUCET_EMPTY",
        message: "The faucet is being refilled. Try again in a little while.",
        faucetBalance: faucetBalance.toString(),
      },
      { status: 503 },
    );
  }

  const claimKey = address.toLowerCase();
  if (inFlight.has(claimKey)) {
    return NextResponse.json(
      {
        error: "IN_PROGRESS",
        message: "This wallet already has a drip in flight.",
      },
      { status: 429 },
    );
  }

  inFlight.add(claimKey);
  try {
    const transactionHash = await sendFaucetDrip(address as Address, amount);

    // The drip is already broadcast. A store failure must not turn a successful
    // send into an error response, or the visitor would retry and receive a
    // second drip.
    try {
      await recordFaucetClaim(address, Date.now());
    } catch (error) {
      console.error("faucet claim record failed", error);
    }

    return NextResponse.json(
      {
        transactionHash,
        amount: amount.toString(),
        chainId: FAUCET_CHAIN_ID,
        to: address,
        explorerUrl: explorerTxFor(FAUCET_CHAIN_ID, transactionHash),
        nextClaimAt: Date.now() + cooldownMs,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("faucet drip failed", error);
    return NextResponse.json(
      {
        error: "SEND_FAILED",
        message: "The testnet HYPE could not be sent. Please retry.",
        officialUrl: LINKS.faucet,
      },
      { status: 502 },
    );
  } finally {
    inFlight.delete(claimKey);
  }
}
