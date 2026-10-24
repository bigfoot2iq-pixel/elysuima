import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Display face for the collection identity. Bricolage Grotesque carries the
// same chunky, illustrated confidence as the mascot art without the usual
// startup-gradient look.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Elyziuma — 2,222 NFTs on Elysium",
    template: "%s · Elyziuma",
  },
  description:
    "Elyziuma is a 2,222-piece NFT collection built on Elysium. Claim 100 ELYZ every 24 hours, mint the collection, and follow the roadmap to the first raffle platform on Elysium.",
  applicationName: "Elyziuma",
  keywords: [
    "Elyziuma",
    "ELYZ",
    "Elysium",
    "NFT collection",
    "raffle platform",
    "daily claim",
    "NFT launchpad",
    "mint",
    "OpenSea SeaDrop",
    "Kinetiq",
  ],
  authors: [{ name: "Elyziuma" }],
  creator: "Elyziuma",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "Elyziuma",
    title: "Elyziuma — 2,222 NFTs on Elysium",
    description:
      "A 2,222-piece NFT collection on Elysium, with a daily ELYZ claim and a roadmap to the first raffle platform on the chain.",
    url: SITE_URL,
    locale: "en_US",
    images: ["/brand/elyziuma-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@Elyziumaa",
    creator: "@Elyziumaa",
    title: "Elyziuma — 2,222 NFTs on Elysium",
    description:
      "A 2,222-piece NFT collection on Elysium, with a daily ELYZ claim and a roadmap to the first raffle platform on the chain.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#04181c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col bg-ink text-paper">
        <div className="site-bg" aria-hidden="true" />
        <div className="site-grain" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
