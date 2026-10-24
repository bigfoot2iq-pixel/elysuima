import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { isElysiumChainId } from "@/lib/chains";
import {
  LaunchpadAuthError,
  verifyLaunchpadAdmin,
} from "@/lib/server/launchpad-auth";
import { getLaunchpadConfig } from "@/lib/server/launchpad-config";
import { inspectContract } from "@/lib/server/launchpad-inspect";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`launchpad-inspect:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many inspections. Wait a moment." },
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Expected a JSON body." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Expected a JSON object." },
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;
  const { address, timestamp, signature, payload } = input;

  if (
    typeof address !== "string" ||
    typeof signature !== "string" ||
    typeof timestamp !== "number" ||
    !Number.isSafeInteger(timestamp) ||
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Address, timestamp, payload, and signature are required.",
      },
      { status: 400 },
    );
  }

  const values = payload as Record<string, unknown>;
  const config = await getLaunchpadConfig();

  const rpcUrl =
    typeof values.rpcUrl === "string" && values.rpcUrl.trim()
      ? values.rpcUrl.trim()
      : config.rpcUrl;
  const chainId =
    typeof values.chainId === "number" && isElysiumChainId(values.chainId)
      ? values.chainId
      : config.chainId;
  const collectionAddress =
    typeof values.collectionAddress === "string"
      ? values.collectionAddress.trim()
      : config.collectionAddress;
  const seaDropAddress =
    typeof values.seaDropAddress === "string"
      ? values.seaDropAddress.trim()
      : config.seaDropAddress;
  const feeRecipient =
    typeof values.feeRecipient === "string"
      ? values.feeRecipient.trim()
      : config.feeRecipient;

  if (collectionAddress && !isAddress(collectionAddress)) {
    return NextResponse.json(
      {
        error: "INVALID_ADDRESS",
        message: "Enter a valid collection contract address.",
      },
      { status: 400 },
    );
  }

  if (seaDropAddress && !isAddress(seaDropAddress)) {
    return NextResponse.json(
      { error: "INVALID_ADDRESS", message: "Enter a valid SeaDrop address." },
      { status: 400 },
    );
  }

  if (feeRecipient && !isAddress(feeRecipient)) {
    return NextResponse.json(
      {
        error: "INVALID_ADDRESS",
        message: "Enter a valid SeaDrop fee recipient.",
      },
      { status: 400 },
    );
  }

  try {
    await verifyLaunchpadAdmin({
      action: "inspect-contract",
      address,
      timestamp,
      signature,
      payload,
      collectionAddress: collectionAddress || undefined,
    });

    const inspection = await inspectContract({
      rpcUrl,
      chainId,
      collectionAddress: collectionAddress || undefined,
      seaDropAddress: seaDropAddress || undefined,
      feeRecipient: feeRecipient || undefined,
    });

    return NextResponse.json(
      { inspection },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof LaunchpadAuthError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }

    console.error("launchpad inspect failed", error);
    return NextResponse.json(
      {
        error: "INSPECTION_FAILED",
        message: "The contract could not be inspected.",
      },
      { status: 500 },
    );
  }
}
