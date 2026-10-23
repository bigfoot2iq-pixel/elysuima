"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { useState, type ReactNode } from "react";
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { http, WagmiProvider } from "wagmi";
import { elysiumTestnet } from "@/lib/chains";
import { WALLETCONNECT_PROJECT_ID } from "@/lib/config";

const wagmiConfig = getDefaultConfig({
  appName: "Elyziuma",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [elysiumTestnet],
  transports: {
    [elysiumTestnet.id]: http(
      process.env.NEXT_PUBLIC_ELYSIUM_RPC_URL ??
        "https://testnet-rpc.elysium.kinetiq.xyz",
    ),
  },
  ssr: true,
});

const rainbowTheme = darkTheme({
  accentColor: "#34B7DD",
  accentColorForeground: "#04181C",
  borderRadius: "large",
  fontStack: "system",
  overlayBlur: "small",
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={rainbowTheme}
          modalSize="compact"
          locale="en-US"
        >
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            closeButton
            toastOptions={{
              className: "font-sans",
              style: {
                background: "#071F24",
                border: "1px solid rgba(248,247,244,0.12)",
                color: "#F8F7F4",
                borderRadius: "16px",
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
