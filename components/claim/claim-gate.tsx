"use client";

import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useClaimAccess } from "@/hooks/use-claim-access";
import { getElysiumChain } from "@/lib/chains";
import { CLAIM_CHAIN_ID } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import { ClaimContent } from "./claim-content";

const claimChain = getElysiumChain(CLAIM_CHAIN_ID);

export function ClaimGate() {
  const { address, authorized, checking, error, refetch } = useClaimAccess();
  const { openConnectModal } = useConnectModal();

  if (authorized) return <ClaimContent />;

  const disconnected = !address && !checking;

  return (
    <section className="section-shell flex min-h-[74vh] items-center justify-center pb-24 pt-14">
      <div className="glass relative w-full max-w-2xl overflow-hidden rounded-[32px] p-6 sm:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-brand/10 blur-[80px]"
        />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.06] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-brand">
              <LockKeyhole className="size-3" />
              Private preview
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-paper/10 bg-paper/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
              Elysium · {claimChain.id}
            </span>
          </div>

          <h1 className="mt-6 max-w-[22ch] text-3xl font-semibold tracking-[-0.04em] text-paper sm:text-4xl">
            The claim page is private for now.
          </h1>
          <p className="mt-4 max-w-lg text-[13px] leading-7 text-paper-dim">
            Only the NFT collection owner and admins can open the daily claim
            while it is being tested. Connect the owner wallet to continue, or
            head back to the launchpad.
          </p>

          <div className="mt-7 rounded-2xl border border-paper/[0.08] bg-ink/40 p-4 sm:p-5">
            {checking ? (
              <div className="flex items-center gap-3 text-paper-dim">
                <Loader2 className="size-4 animate-spin text-brand" />
                <p className="text-xs">Checking this wallet for admin access…</p>
              </div>
            ) : error ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-warn">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">
                      Access could not be verified
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-warn/80">
                      {error.message ||
                        "The server did not answer the access check."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="btn-ghost h-10 px-4 text-[11px]"
                >
                  <RefreshCw className="size-3.5" />
                  Try again
                </button>
              </div>
            ) : disconnected ? (
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <Wallet className="mt-0.5 size-4 shrink-0 text-brand" />
                  <div>
                    <p className="text-xs font-semibold text-paper">
                      Connect the owner wallet
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-paper-mute">
                      Access is verified on-chain from the collection contract
                      owner.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="btn-primary w-full px-5 sm:w-auto"
                >
                  Connect wallet
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-warn" />
                  <div>
                    <p className="text-xs font-semibold text-paper">
                      This wallet is not authorized yet
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-paper-mute">
                      Connected as{" "}
                      <span className="font-mono text-paper-dim">
                        {address ? shortAddress(address, 6) : "unknown"}
                      </span>
                      . Use the owner or admin wallet to open the claim.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="btn-ghost w-full px-5 sm:w-auto"
                >
                  Switch wallet
                </button>
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-paper/[0.07] pt-5">
            <Link href="/launchpad" className="btn-ghost h-11 px-5">
              <ArrowLeft className="size-3.5" />
              Back to launchpad
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-mute transition hover:text-brand"
            >
              Owner console
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
