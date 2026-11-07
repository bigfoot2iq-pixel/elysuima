"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Ticket, Trophy } from "lucide-react";
import { shortAddress } from "@/lib/format";
import type { Raffle, RaffleAccent } from "@/lib/raffles";
import { cn } from "@/lib/utils";
import { EnterRaffleDialog } from "./enter-raffle-dialog";

/** Every demo draw starts ten hours from the moment its card mounts. */
const COUNTDOWN_SECONDS = 10 * 60 * 60;

const ACCENTS: Record<
  RaffleAccent,
  { line: string; dot: string; text: string }
> = {
  atlassians: {
    line: "from-transparent via-[#ffd23f]/70 to-transparent",
    dot: "bg-[#ffd23f]",
    text: "text-[#ffe58a]",
  },
  elytra: {
    line: "from-transparent via-[#8bd450]/70 to-transparent",
    dot: "bg-[#8bd450]",
    text: "text-[#c8f59a]",
  },
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * One raffle card. Live and settled draws share the frame, artwork, title,
 * stats, and footer rhythm. Only the live draw carries the active ring,
 * progress bar, countdown, and entry action.
 */
export function RaffleCard({ raffle }: { raffle: Raffle }) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [entryOpen, setEntryOpen] = useState(false);

  useEffect(() => {
    if (raffle.status !== "live") return;

    const deadline = Date.now() + COUNTDOWN_SECONDS * 1_000;

    const tick = () => {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)));
    };

    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [raffle.id, raffle.status]);

  const hours = Math.floor(remaining / 3_600);
  const minutes = Math.floor((remaining % 3_600) / 60);
  const seconds = remaining % 60;
  const countdown = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  const closed = raffle.status === "live" && remaining <= 0;
  const progress =
    raffle.status === "live"
      ? Math.min(
          100,
          (raffle.joined / Math.max(1, raffle.capacity)) * 100,
        )
      : 0;
  const spotsLeft =
    raffle.status === "live"
      ? Math.max(0, raffle.capacity - raffle.joined)
      : 0;
  const closeEntry = useCallback(() => setEntryOpen(false), []);

  const live = raffle.status === "live";
  const active = live && !closed;
  const accent = raffle.accent ? ACCENTS[raffle.accent] : null;
  const displayTitle = raffle.title
    ? `${raffle.name} — ${raffle.title}`
    : raffle.name;

  return (
    <>
      <article
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-[22px] p-1.5",
          live
            ? "glass card-sheen ring-1 ring-brand/35 shadow-[0_0_46px_-28px_rgba(52,183,221,0.9)]"
            : "glass",
        )}
      >
        {accent ? (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r",
              accent.line,
            )}
          />
        ) : null}

        <div className="relative overflow-hidden rounded-[16px] border border-paper/[0.08] bg-ink">
          <div className="relative aspect-square">
            <Image
              src={raffle.image}
              alt={`${displayTitle}, ${
                live ? "live raffle prize" : "past raffle winner"
              }`}
              fill
              preload={live}
              sizes="(max-width: 639px) 92vw, (max-width: 1023px) 45vw, 285px"
              style={{
                imageRendering: raffle.pixelated ? "pixelated" : undefined,
              }}
              className={cn(
                "object-cover object-center",
                live ? "saturate-100" : "saturate-[0.82]",
              )}
            />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/55 via-transparent to-ink/25"
          />

          <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border bg-ink/75 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] backdrop-blur",
                active
                  ? "border-mint/25 text-mint"
                  : "border-paper/10 text-paper-dim",
              )}
            >
              {active ? (
                <span className="live-dot" />
              ) : (
                <span className="size-1.5 rounded-full bg-paper-mute" />
              )}
              {live ? (closed ? "Closed" : "Live") : "Ended"}
            </span>
            {raffle.tokenId ? (
              <span className="rounded-full border border-paper/10 bg-ink/75 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-paper-dim backdrop-blur">
                #{raffle.tokenId}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col px-2 pb-2 pt-2.5">
          <h2
            title={displayTitle}
            className="truncate text-[14px] font-semibold tracking-[-0.02em] text-paper"
          >
            {raffle.name}
            {raffle.title ? (
              <span className="text-paper-dim"> — {raffle.title}</span>
            ) : null}
          </h2>
          <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[9px] text-paper-mute">
            {accent ? (
              <span
                aria-hidden="true"
                className={cn("size-1.5 shrink-0 rounded-full", accent.dot)}
              />
            ) : null}
            {raffle.collectionUrl ? (
              <a
                href={raffle.collectionUrl}
                target="_blank"
                rel="noreferrer"
                title={`Open the ${raffle.collection} collection`}
                className={cn(
                  "truncate underline-offset-2 transition hover:underline",
                  accent?.text,
                )}
              >
                {raffle.collection} collection
              </a>
            ) : (
              <span className={cn("truncate", accent?.text)}>
                {raffle.collection} collection
              </span>
            )}
            <span className="text-paper/[0.25]">·</span>
            <span className="shrink-0">1 of 1</span>
            {live ? (
              <>
                <span className="text-paper/[0.25]">·</span>
                <span className="shrink-0">{raffle.winners} winner</span>
              </>
            ) : null}
          </p>

          <dl className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-paper/[0.08] bg-paper/[0.06]">
            <Stat
              label="Joined"
              value={raffle.joined.toLocaleString("en-US")}
            />
            <Stat
              label="Entry fee"
              value={`${raffle.entryFee} ELYZ`}
            />
          </dl>

          {raffle.status === "live" ? (
            <div className="mt-2">
              <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.1em] text-paper-mute">
                <span>
                  {raffle.joined.toLocaleString("en-US")} /{" "}
                  {raffle.capacity.toLocaleString("en-US")} joined
                </span>
                <span>{spotsLeft.toLocaleString("en-US")} left</span>
              </div>
              <div
                role="progressbar"
                aria-label="Raffle spots claimed"
                aria-valuemin={0}
                aria-valuemax={raffle.capacity}
                aria-valuenow={raffle.joined}
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper/[0.06]"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-mint"
                  style={{ width: `${Math.max(progress, 1.5)}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-auto pt-2.5">
            {raffle.status === "live" ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-paper-mute">
                    Ends in
                  </span>
                  <span
                    role="timer"
                    aria-label={`Raffle ends in ${countdown}`}
                    className="tabular font-mono text-[12px] font-semibold text-paper"
                  >
                    {countdown}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEntryOpen(true)}
                  disabled={closed}
                  className="btn-primary mt-1.5 w-full"
                  style={{ height: 44 }}
                >
                  <Ticket className="size-3.5" />
                  {closed
                    ? "Entries closed"
                    : `Enter raffle · ${raffle.entryFee} ELYZ`}
                </button>
              </>
            ) : (
              <div className="rounded-xl border border-paper/[0.07] bg-ink/40 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-warn/20 bg-warn/10 text-warn">
                    <Trophy className="size-3" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase tracking-[0.14em] text-paper-mute">
                      Winner
                    </p>
                    <p className="truncate font-mono text-[10px] text-paper">
                      {shortAddress(raffle.winner, 4)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-paper-mute/70">
                  Closed {raffle.closedOn} · Prize delivered
                </p>
              </div>
            )}
          </div>
        </div>
      </article>

      {raffle.status === "live" ? (
        <EnterRaffleDialog
          open={entryOpen}
          raffle={raffle}
          countdown={countdown}
          onClose={closeEntry}
        />
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink/70 px-2 py-1.5">
      <dd className="tabular font-mono text-[12px] font-semibold text-paper">
        {value}
      </dd>
      <dt className="mt-0.5 text-[8px] uppercase tracking-[0.14em] text-paper-mute">
        {label}
      </dt>
    </div>
  );
}
