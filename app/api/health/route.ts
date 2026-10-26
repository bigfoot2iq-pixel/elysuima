import { NextResponse } from "next/server";
import { CLAIM_CHAIN_ID, IS_CONFIGURED } from "@/lib/config";
import { getClaimState } from "@/lib/server/elysium";

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

  try {
    const state = await getClaimState();
    const outstanding =
      state.nftPoolRemaining + state.communityPoolRemaining;
    const funded = state.tokenBalance >= outstanding;

    return NextResponse.json({
      ok: !state.paused && funded,
      configured: true,
      chainId: CLAIM_CHAIN_ID,
      paused: state.paused,
      nftAddress: state.nftAddress,
      communityClaimFee: state.communityClaimFee.toString(),
      feeRecipient: state.feeRecipient,
      accruedFees: state.accruedFees.toString(),
      nftClaimedTotal: state.nftClaimedTotal.toString(),
      communityClaimedTotal: state.communityClaimedTotal.toString(),
      nftPoolRemaining: state.nftPoolRemaining.toString(),
      communityPoolRemaining: state.communityPoolRemaining.toString(),
      tokenBalance: state.tokenBalance.toString(),
      funded,
      chainTime: state.chainTime,
      blockNumber: state.blockNumber,
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
