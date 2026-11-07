"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Info, Ticket, X } from "lucide-react";
import type { ActiveRaffle } from "@/lib/raffles";

export function EnterRaffleDialog({
  open,
  raffle,
  countdown,
  onClose,
}: {
  open: boolean;
  raffle: ActiveRaffle;
  countdown: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="raffle-entry-title"
          aria-describedby="raffle-demo-note"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={trapFocus}
          className="glass card-sheen relative w-full max-w-[440px] overflow-hidden rounded-[28px] border border-brand/20 p-4 shadow-[0_40px_120px_-24px_rgba(0,0,0,0.95)] sm:p-5"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close raffle entry preview"
            className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full border border-paper/10 bg-ink/60 text-paper-dim transition hover:border-paper/25 hover:text-paper"
          >
            <X className="size-4" />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl border border-paper/10 bg-ink">
              <Image
                src={raffle.image}
                alt={`${raffle.name} raffle prize`}
                fill
                sizes="56px"
                className="object-cover"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-brand">
                Live raffle
              </p>
              <h2
                id="raffle-entry-title"
                className="mt-1 truncate font-display text-xl font-extrabold tracking-[-0.03em] text-paper"
              >
                {raffle.name} raffle
              </h2>
              <p className="mt-0.5 text-[11px] text-paper-mute">
                {raffle.title} <span className="text-paper/[0.25]">·</span> 1 of
                1 prize
              </p>
            </div>
          </div>

          <dl className="mt-4 divide-y divide-paper/[0.07] overflow-hidden rounded-xl border border-paper/[0.08] bg-ink/40">
            <SummaryRow
              label="Prize"
              value={`${raffle.name} #${raffle.tokenId}`}
            />
            <SummaryRow label="Entry fee" value={`${raffle.entryFee} ELYZ`} />
            <SummaryRow
              label="Joined"
              value={`${raffle.joined.toLocaleString("en-US")} collectors`}
            />
            <SummaryRow
              label="Ends in"
              value={<span className="tabular text-brand">{countdown}</span>}
            />
          </dl>

          <div
            id="raffle-demo-note"
            className="mt-4 flex gap-2.5 rounded-xl border border-brand/20 bg-brand/[0.06] px-3 py-3"
          >
            <Info className="mt-0.5 size-3.5 shrink-0 text-brand" />
            <p className="text-[10px] leading-5 text-paper-dim">
              <span className="font-semibold text-paper">UI demo.</span> Wallet
              connection, ELYZ approval, and on-chain entry are not connected
              yet.
            </p>
          </div>

          <button type="button" onClick={onClose} className="btn-primary mt-4 w-full">
            <Ticket className="size-4" />
            Close preview
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
      <dt className="text-[10px] uppercase tracking-[0.14em] text-paper-mute">
        {label}
      </dt>
      <dd className="font-mono text-[11px] font-semibold text-paper">{value}</dd>
    </div>
  );
}
