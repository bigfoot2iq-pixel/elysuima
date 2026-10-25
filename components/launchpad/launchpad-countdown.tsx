"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Sparkles } from "lucide-react";
import type { PublicLaunchpadConfig } from "@/lib/launchpad/types";
import { TokenMark } from "../token-mark";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function splitCountdown(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

/**
 * Full-page countdown shown while an admin-scheduled start time is in the
 * future. It replaces the mint UI, and hands control back to the launchpad the
 * moment the target is reached so the visitor does not have to reload.
 */
export function LaunchpadCountdown({
  config,
  collectionName,
  target,
  onStart,
}: {
  config: PublicLaunchpadConfig;
  collectionName?: string;
  target: number;
  onStart: () => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, target - Math.floor(Date.now() / 1_000)),
  );
  const started = useRef(false);

  useEffect(() => {
    started.current = false;

    const tick = () => {
      const next = Math.max(0, target - Math.floor(Date.now() / 1_000));
      setRemaining(next);

      if (next === 0 && !started.current) {
        started.current = true;
        onStart();
      }
    };

    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [target, onStart]);

  const parts = splitCountdown(remaining);
  const units = [
    {
      label: "Days",
      value: parts.days > 999 ? "999+" : String(parts.days),
    },
    { label: "Hours", value: pad(parts.hours) },
    { label: "Minutes", value: pad(parts.minutes) },
    { label: "Seconds", value: pad(parts.seconds) },
  ];

  const openDate = useMemo(() => new Date(target * 1_000), [target]);
  const openLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(openDate),
    [openDate],
  );

  return (
    <section className="section-shell py-12 sm:py-20">
      <div className="relative mx-auto max-w-3xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 -top-16 h-56 rounded-full bg-brand/[0.09] blur-3xl"
        />

        <div className="glass card-sheen relative overflow-hidden rounded-[32px] px-5 py-10 text-center sm:px-10 sm:py-14">
          <div className="flex items-center justify-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-brand/[0.06]">
              <TokenMark size={22} />
            </span>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-semibold tracking-[-0.02em] text-paper">
                {collectionName || config.title}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-brand">
                Scheduled mint
              </p>
            </div>
          </div>

          <p className="mt-9 font-mono text-[9px] uppercase tracking-[0.24em] text-paper-mute">
            Mint opens in
          </p>

          <div
            role="timer"
            aria-label={`Mint opens in ${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds`}
            className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-3"
          >
            {units.map((unit) => (
              <div
                key={unit.label}
                className="rounded-2xl border border-paper/[0.08] bg-ink/55 px-1 py-3.5 sm:py-5"
              >
                <span className="tabular block font-display text-[26px] font-semibold leading-none tracking-[-0.04em] text-paper sm:text-[42px]">
                  {unit.value}
                </span>
                <span className="mt-2 block text-[7px] uppercase tracking-[0.18em] text-paper-mute sm:text-[8px]">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col items-center justify-center gap-1.5 text-[10px] text-paper-mute sm:flex-row sm:gap-2">
            <CalendarClock className="size-3.5 shrink-0 text-brand" />
            <time dateTime={openDate.toISOString()}>{openLabel}</time>
          </div>

          <p className="mx-auto mt-4 max-w-md text-[11px] leading-6 text-paper-mute">
            {config.tagline}
          </p>

          <div className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-full border border-paper/[0.07] bg-paper/[0.025] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-paper-mute">
            <Sparkles className="size-3 shrink-0 text-brand" />
            The mint opens here automatically
          </div>
        </div>
      </div>
    </section>
  );
}
