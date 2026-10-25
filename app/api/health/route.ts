import { NextResponse } from "next/server";
import { CLAIM_CHAIN_ID, IS_CONFIGURED } from "@/lib/config";
import { getClaimState } from "@/lib/server/elysium";
import { getSignerAccount } from "@/lib/server/signature";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function GET() {
  if (!IS_CONFIGURED) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message: "Claim contracts are not configured.",
      },
      { status: 503 },
    );
  }

  const signer = getSignerAccount();

  try {
    const state = await getClaimState(ZERO_ADDRESS);
    const signerMatches =
      signer !== null && signer.address.toLowerCase() === state.signer.toLowerCase();

    return NextResponse.json({
      ok: signerMatches && !state.paused,
      configured: true,
      chainId: CLAIM_CHAIN_ID,
      signerConfigured: signer !== null,
      signerMatches,
      paused: state.paused,
      dailyAmount: state.dailyAmount.toString(),
      faucetBalance: state.faucetBalance.toString(),
      chainTime: state.chainTime,
    });
  } catch (error) {
    console.error("health check failed", error);
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        message: "Could not read the claim contract.",
      },
      { status: 503 },
    );
  }
}
