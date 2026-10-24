import { NextResponse } from "next/server";
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
} from "viem";
import {
  LaunchpadConfigError,
  normalizeLaunchpadConfig,
} from "@/lib/launchpad/config";
import { getElysiumChain } from "@/lib/chains";
import {
  LaunchpadAuthError,
  checkLaunchpadAdmin,
  verifyLaunchpadAdmin,
} from "@/lib/server/launchpad-auth";
import { getLaunchpadConfig, saveLaunchpadConfig } from "@/lib/server/launchpad-config";
import { testRpc } from "@/lib/server/launchpad-inspect";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

function errorResponse(error: unknown) {
  if (error instanceof LaunchpadAuthError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status },
    );
  }

  if (error instanceof LaunchpadConfigError) {
    return NextResponse.json(
      {
        error: "INVALID_CONFIG",
        message: error.message,
        fields: error.fields,
      },
      { status: 400 },
    );
  }

  console.error("launchpad admin request failed", error);
  return NextResponse.json(
    {
      error: "REQUEST_FAILED",
      message: "The launchpad settings could not be updated.",
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`launchpad-admin-read:${ip}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many requests. Wait a moment." },
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

  if (address && !isAddress(address)) {
    return NextResponse.json(
      { error: "INVALID_ADDRESS", message: "Enter a valid wallet address." },
      { status: 400 },
    );
  }

  try {
    const config = await getLaunchpadConfig();
    const admin = address
      ? await checkLaunchpadAdmin(getAddress(address))
      : { authorized: false, sources: [] as const };

    return NextResponse.json(
      { config, admin },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`launchpad-admin-write:${ip}`, 12, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many save attempts. Wait a moment." },
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

  try {
    await verifyLaunchpadAdmin({
      action: "update-launchpad",
      address,
      timestamp,
      signature,
      payload,
    });

    const current = await getLaunchpadConfig();
    const candidate = normalizeLaunchpadConfig(
      { ...current, ...(payload as Record<string, unknown>) },
      { strict: true },
    );

    const rpc = await testRpc(candidate.rpcUrl, candidate.chainId);
    if (!rpc.ok) {
      return NextResponse.json(
        {
          error:
            rpc.chainId !== undefined && rpc.chainId !== candidate.chainId
              ? "WRONG_CHAIN"
              : "RPC_UNAVAILABLE",
          message:
            rpc.message ??
            `The RPC must report chain ${candidate.chainId}.`,
        },
        { status: 400 },
      );
    }

    if (candidate.collectionAddress) {
      const collection = getAddress(candidate.collectionAddress);
      const client = createPublicClient({
        transport: http(candidate.rpcUrl, {
          timeout: 10_000,
          retryCount: 1,
        }),
      });
      const code = await client
        .getCode({ address: collection })
        .catch(() => undefined);

      if (!code || code === "0x") {
        const chain = getElysiumChain(candidate.chainId);
        return NextResponse.json(
          {
            error: "CONTRACT_NOT_FOUND",
            message: `No contract code was found at that collection address on ${chain.name}.`,
          },
          { status: 400 },
        );
      }
    }

    const saved = await saveLaunchpadConfig(payload);
    return NextResponse.json(
      { config: saved },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
