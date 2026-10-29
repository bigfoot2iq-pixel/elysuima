import { NextResponse } from "next/server";
import {
  ADMIN_LOGIN_MAX_AGE_SECONDS,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
} from "@/lib/admin/access";
import {
  AdminSessionError,
  authenticateAdminLogin,
  encodeAdminSession,
  getAdminOwnerAddress,
  readClaimSession,
} from "@/lib/server/admin-session";
import { getClientIp, rateLimit } from "@/lib/server/rate-limit";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET() {
  const session = await readClaimSession();

  return NextResponse.json(
    {
      authenticated: Boolean(session),
      address: session?.address ?? null,
      expiresAt: session?.expiresAt ?? null,
      owner: getAdminOwnerAddress(),
      sessionSeconds: ADMIN_SESSION_TTL_SECONDS,
      loginWindowSeconds: ADMIN_LOGIN_MAX_AGE_SECONDS,
    },
    { headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`admin-session:${ip}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Too many unlock attempts. Wait a moment.",
      },
      {
        status: 429,
        headers: {
          ...NO_STORE,
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
      { status: 400, headers: NO_STORE },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Expected a JSON object." },
      { status: 400, headers: NO_STORE },
    );
  }

  const input = body as Record<string, unknown>;
  const { address, issuedAt, expiresAt, nonce, signature } = input;

  if (
    typeof address !== "string" ||
    typeof issuedAt !== "number" ||
    typeof expiresAt !== "number" ||
    typeof nonce !== "string" ||
    typeof signature !== "string"
  ) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Address, timestamps, nonce, and signature are required.",
      },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const { session, record } = await authenticateAdminLogin({
      address,
      issuedAt,
      expiresAt,
      nonce,
      signature,
    });

    const now = Math.floor(Date.now() / 1000);
    const response = NextResponse.json(
      {
        authenticated: true,
        address: session.address,
        expiresAt: session.expiresAt,
      },
      { headers: NO_STORE },
    );

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: encodeAdminSession(record),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, session.expiresAt - now),
      priority: "high",
    });

    return response;
  } catch (error) {
    if (error instanceof AdminSessionError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status, headers: NO_STORE },
      );
    }

    console.error("admin session request failed", error);
    return NextResponse.json(
      {
        error: "REQUEST_FAILED",
        message: "The console could not be unlocked.",
      },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json(
    { authenticated: false },
    { headers: NO_STORE },
  );
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
