import type { Metadata, Viewport } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Elyziuma — Your daily ELYZ on Elysium",
    template: "%s · Elyziuma",
  },
  description:
    "Claim 100 ELYZ every 24 hours on Elysium. Hold at least 0.001 ETH on Ethereum, Abstract, Base, or Ink to qualify.",
  applicationName: "Elyziuma",
  keywords: [
    "Elyziuma",
    "ELYZ",
    "Elysium",
    "daily claim",
    "faucet",
    "testnet",
    "Kinetiq",
  ],
  authors: [{ name: "Elyziuma" }],
  creator: "Elyziuma",
  openGraph: {
    type: "website",
    siteName: "Elyziuma",
    title: "Elyziuma — Your daily ELYZ on Elysium",
    description:
      "One claim every 24 hours. Hold at least 0.001 ETH on Ethereum, Abstract, Base, or Ink.",
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@Elyziumaa",
    creator: "@Elyziumaa",
    title: "Elyziuma — Your daily ELYZ on Elysium",
    description:
      "One claim every 24 hours. Hold at least 0.001 ETH on Ethereum, Abstract, Base, or Ink.",
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
      className={`${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col bg-ink text-paper">
        <div className="site-bg" aria-hidden="true" />
        <div className="site-grain" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
