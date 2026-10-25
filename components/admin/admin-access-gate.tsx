"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAccountModal, useConnectModal } from "@rainbow-me/rainbowkit";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Address } from "viem";
import { useAccount, useSignMessage } from "wagmi";
import {
  ADMIN_SESSION_TTL_SECONDS,
  buildAdminSessionMessage,
} from "@/lib/admin/access";
import { shortAddress } from "@/lib/format";
import { sameAddress, responseError, txError } from "./admin-utils";
import { Notice, Panel } from "./admin-ui";

function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

const emptySubscribe = () => () => {};

/** Wagmi reconnects on the client, so avoid guessing the wallet state on SSR. */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function AdminAccessGate({ ownerAddress }: { ownerAddress: Address }) {
  const router = useRouter();
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { signMessageAsync } = useSignMessage();

  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = sameAddress(address, ownerAddress);
  const hours = Math.round(ADMIN_SESSION_TTL_SECONDS / 3600);

  async function unlock() {
    if (!address || !isOwner || signing) return;

    setSigning(true);
    setError(null);

    try {
      const issuedAt = Math.floor(Date.now() / 1000);
      const expiresAt = issuedAt + ADMIN_SESSION_TTL_SECONDS;
      const nonce = createNonce();
      const message = buildAdminSessionMessage({
        address,
        issuedAt,
        expiresAt,
        nonce,
      });

      const signature = await signMessageAsync({ message });
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, issuedAt, expiresAt, nonce, signature }),
      });

      if (!response.ok) throw new Error(await responseError(response));

      toast.success("Owner console unlocked", {
        description: `This browser stays unlocked for ${hours} hours.`,
      });
      router.refresh();
    } catch (caught) {
      setError(txError(caught));
    } finally {
      setSigning(false);
    }
  }

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
              Owner access
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-paper/10 bg-paper/[0.03] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim">
              <ShieldCheck className="size-3" />
              Signed message
            </span>
          </div>

          <h1 className="mt-6 max-w-[24ch] text-3xl font-semibold tracking-[-0.04em] text-paper sm:text-4xl">
            The owner console is locked.
          </h1>
          <p className="mt-4 max-w-lg text-[13px] leading-7 text-paper-dim">
            Only the wallet that owns the Elyziuma NFT collection can open this
            console. Connect the owner wallet and sign a free message — no
            transaction, no gas, no approvals.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-paper/[0.07] bg-ink/40 px-3.5 py-2.5">
            <span className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
              Collection owner
            </span>
            <span className="font-mono text-[11px] text-paper">
              {shortAddress(ownerAddress, 6)}
            </span>
          </div>

          <div className="mt-7">
            {!mounted ? (
              <Panel className="p-4 sm:p-5">
                <div className="flex items-center gap-3 text-paper-dim">
                  <Loader2 className="size-4 animate-spin text-brand" />
                  <p className="text-xs">Checking the connected wallet…</p>
                </div>
              </Panel>
            ) : !isConnected ? (
              <Panel className="p-4 sm:p-5">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Wallet className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-paper">
                        Connect the owner wallet
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-paper-mute">
                        The wallet must match the collection owner address
                        above.
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
              </Panel>
            ) : isOwner ? (
              <Panel className="p-4 sm:p-5">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint/10 text-mint">
                      <Check className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-paper">
                        Owner wallet connected
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-paper-mute">
                        {shortAddress(address, 6)} · Sign once to unlock this
                        browser for {hours} hours.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void unlock()}
                    disabled={signing}
                    className="btn-primary w-full px-5 sm:w-auto"
                  >
                    {signing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <LockKeyhole className="size-4" />
                    )}
                    {signing ? "Waiting for signature…" : "Sign to unlock"}
                  </button>
                </div>
              </Panel>
            ) : (
              <Panel className="p-4 sm:p-5">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warn/10 text-warn">
                      <ShieldCheck className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-paper">
                        This wallet is not the collection owner
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-paper-mute">
                        Connected as{" "}
                        <span className="font-mono text-paper-dim">
                          {address ? shortAddress(address, 6) : "unknown"}
                        </span>
                        . Switch to the owner wallet to continue.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAccountModal?.()}
                    className="btn-ghost h-11 w-full px-5 sm:w-auto"
                  >
                    Switch wallet
                  </button>
                </div>
              </Panel>
            )}
          </div>

          {error ? (
            <div className="mt-4">
              <Notice
                tone="danger"
                title="Could not unlock the console"
                body={error}
              />
            </div>
          ) : null}

          <ol className="mt-7 space-y-2.5 border-t border-paper/[0.07] pt-5 text-[11px] leading-5 text-paper-mute">
            <li className="flex gap-2.5">
              <span className="font-mono text-[9px] text-brand">01</span>
              Connect the wallet that owns the NFT collection.
            </li>
            <li className="flex gap-2.5">
              <span className="font-mono text-[9px] text-brand">02</span>
              Sign a free message. It cannot move funds or approve tokens.
            </li>
            <li className="flex gap-2.5">
              <span className="font-mono text-[9px] text-brand">03</span>
              The server verifies the signature before any console data loads.
            </li>
          </ol>

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-paper/[0.07] pt-5">
            <Link href="/" className="btn-ghost h-11 px-5">
              <ArrowLeft className="size-3.5" />
              Back to site
            </Link>
            <Link
              href="/launchpad"
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-mute transition hover:text-brand"
            >
              View launchpad
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
