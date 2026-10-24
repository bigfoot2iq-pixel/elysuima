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
import { WagmiProvider } from "wagmi";
import { elysium, elysiumTestnet } from "@/lib/chains";
import { WALLETCONNECT_PROJECT_ID } from "@/lib/config";
import { createRuntimeTransport } from "@/lib/launchpad/runtime";
import { useRuntimeNetworkSync } from "@/hooks/use-launchpad-config";

// Both Elysium networks are registered so the admin console can switch the
// chain at runtime and the wallet can follow.
const wagmiConfig = getDefaultConfig({
  appName: "Elyziuma",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [elysium, elysiumTestnet],
  transports: {
    [elysium.id]: createRuntimeTransport(elysium.id),
    [elysiumTestnet.id]: createRuntimeTransport(elysiumTestnet.id),
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

function NetworkBootstrap() {
  useRuntimeNetworkSync();
  return null;
}

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
        <NetworkBootstrap />
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
