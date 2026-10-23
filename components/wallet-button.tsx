"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AlertTriangle, ChevronDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function WalletButton({ compact = false }: { compact?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
            className={cn("flex items-center gap-2", compact && "w-full")}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className={cn(
                      "group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-ink transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                      compact && "w-full",
                    )}
                  >
                    <Wallet className="size-4" />
                    Connect wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    type="button"
                    onClick={openChainModal}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-warn/40 bg-warn/10 px-4 text-sm font-semibold text-warn transition hover:bg-warn/15"
                  >
                    <AlertTriangle className="size-4" />
                    Switch network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openChainModal}
                    className="hidden h-11 items-center gap-2 rounded-full border border-paper/10 bg-paper/[0.04] px-3 text-xs font-medium text-paper-dim transition hover:border-paper/20 hover:text-paper sm:inline-flex"
                  >
                    <span className="size-1.5 rounded-full bg-mint shadow-[0_0_8px_rgba(125,240,196,0.8)]" />
                    Elysium
                  </button>
                  <button
                    type="button"
                    onClick={openAccountModal}
                    className="inline-flex h-11 items-center gap-2.5 rounded-full border border-paper/10 bg-paper/[0.04] pl-2 pr-3 text-sm font-medium text-paper transition hover:border-brand/40 hover:bg-brand/10"
                  >
                    {account.ensAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={account.ensAvatar}
                        alt=""
                        className="size-7 rounded-full"
                      />
                    ) : (
                      <span className="flex size-7 items-center justify-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">
                        {account.displayName.slice(0, 2)}
                      </span>
                    )}
                    <span className="font-mono text-xs">{account.displayName}</span>
                    <ChevronDown className="size-3.5 text-paper-dim" />
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
