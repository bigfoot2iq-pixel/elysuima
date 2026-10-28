import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getDefaultChainId, getElysiumChain } from "@/lib/chains";

const chain = getElysiumChain(getDefaultChainId());

export const alt = "Elyziuma — ELYZ rewards and NFT mints on Elysium";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(
    path.join(process.cwd(), "public", "brand", "elyziuma-logo.png"),
  );
  const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(900px 520px at 78% -10%, rgba(52,183,221,0.34), transparent 62%), radial-gradient(700px 460px at 4% 28%, rgba(45,115,136,0.3), transparent 64%), linear-gradient(180deg, #04181c 0%, #031216 100%)",
          color: "#f8f7f4",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -150,
            top: -170,
            width: 620,
            height: 620,
            borderRadius: 999,
            border: "1px solid rgba(52,183,221,0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -40,
            top: -60,
            width: 400,
            height: 400,
            borderRadius: 999,
            border: "1px solid rgba(52,183,221,0.14)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.35,
            backgroundImage:
              "linear-gradient(rgba(248,247,244,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(248,247,244,0.06) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "64px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Satori renders the OG image, so it needs a plain <img>. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoDataUrl}
              alt=""
              width={72}
              height={72}
              style={{ borderRadius: 22 }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                }}
              >
                ELYZIUMA
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  letterSpacing: "0.24em",
                  color: "#34b7dd",
                }}
              >
                REWARDS · NFT LAUNCHPAD
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "#7df0c4",
                fontSize: 18,
                letterSpacing: "0.14em",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "#7df0c4",
                  boxShadow: "0 0 18px rgba(125,240,196,0.8)",
                }}
              />
              LIVE ON {chain.name.toUpperCase()} · {chain.id}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 22,
                fontSize: 84,
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: "-0.055em",
              }}
            >
              <span>Your ELYZ rewards,</span>
              <span style={{ color: "#7cd8f2" }}>on Elysium.</span>
            </div>
            <div
              style={{
                marginTop: 24,
                display: "flex",
                gap: 12,
                color: "#b8b2a5",
                fontSize: 22,
              }}
            >
              <span>10K PER NFT</span>
              <span style={{ color: "#2d7388" }}>·</span>
              <span>1K PER WALLET</span>
              <span style={{ color: "#2d7388" }}>·</span>
              <span>0.001 ETH · 0.05/0.005 HYPE · 3 CHAINS</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(248,247,244,0.12)",
              paddingTop: 22,
              color: "#7d7a70",
              fontSize: 16,
            }}
          >
            <span>elyziumaa.xyz</span>
            <span style={{ letterSpacing: "0.18em" }}>CLAIM · MINT · VERIFY</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
