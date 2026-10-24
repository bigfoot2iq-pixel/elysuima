import { NextResponse } from "next/server";
import { toPublicLaunchpadConfig } from "@/lib/launchpad/config";
import { getLaunchpadConfig } from "@/lib/server/launchpad-config";

export async function GET() {
  try {
    const config = await getLaunchpadConfig();

    return NextResponse.json(
      { config: toPublicLaunchpadConfig(config) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("launchpad config read failed", error);
    return NextResponse.json(
      {
        error: "CONFIG_UNAVAILABLE",
        message: "The launchpad settings could not be read.",
      },
      { status: 500 },
    );
  }
}
