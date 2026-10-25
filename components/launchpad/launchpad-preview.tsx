"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { COLLECTION_COVER, MASCOTS } from "@/lib/mascots";
import { cn } from "@/lib/utils";
import { NetworkBadge } from "../network-badge";

type PreviewItem = {
  id: string;
  name: string;
  image: string;
  /** Eyebrow above the name — the rarity tier, or the kind of art. */
  eyebrow: string;
  /** Character role, shown under the name and in the picker. */
  role: string;
  /** Character title, shown under the name. */
  title: string;
  /** One line about the piece. */
  blurb: string;
};

/**
 * The launchpad uses its own set art for the five characters. The rest of the
 * site keeps the mascot portraits from lib/mascots.
 */
const LAUNCHPAD_MASCOT_IMAGES: Record<string, string> = {
  sentinel: "/mascots/launchpad/sentinel.jpg",
  executive: "/mascots/launchpad/executive.jpg",
  overclock: "/mascots/launchpad/overclock.jpg",
  analyst: "/mascots/launchpad/analyst.jpg",
  prism: "/mascots/launchpad/prism.jpg",
};

const PREVIEW_ITEMS: PreviewItem[] = [
  {
    id: COLLECTION_COVER.id,
    name: COLLECTION_COVER.name,
    image: COLLECTION_COVER.image,
    eyebrow: "Cover art",
    role: "Cover",
    title: COLLECTION_COVER.title,
    blurb:
      "The whole cast in one frame. 2,222 pieces, five characters, one drop on Elysium.",
  },
  ...MASCOTS.map((mascot) => ({
    id: mascot.id,
    name: mascot.name,
    image: LAUNCHPAD_MASCOT_IMAGES[mascot.id] ?? mascot.image,
    eyebrow: mascot.rarity,
    role: mascot.role,
    title: mascot.title,
    blurb: mascot.blurb,
  })),
];

/** The cover gets a longer first look; the rest of the set moves faster. */
const FIRST_SLIDE_MS = 10_000;
const SLIDE_MS = 3_000;

/**
 * The main image for the drop. The stage takes the full width of its column so
 * the artwork reads as the headline of the page, with the set listed beside it
 * as a picker. The set advances on its own, but selecting a piece pauses the
 * rotation so the visitor can study it. Reduced-motion visitors start paused.
 */
export function LaunchpadPreview() {
  const [activeId, setActiveId] = useState<string>(PREVIEW_ITEMS[0].id);
  const [isPlaying, setIsPlaying] = useState(true);

  const active =
    PREVIEW_ITEMS.find((item) => item.id === activeId) ?? PREVIEW_ITEMS[0];
  const activeIndex = Math.max(
    0,
    PREVIEW_ITEMS.findIndex((item) => item.id === active.id),
  );

  // A timed carousel is still motion. Start it paused when the visitor asks the
  // operating system for reduced motion; the Play control remains available.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (media.matches) setIsPlaying(false);
    };

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    // The first item is the default view, so it holds for longer than the
    // character slides that follow it.
    const delay = activeIndex === 0 ? FIRST_SLIDE_MS : SLIDE_MS;
    const timer = window.setTimeout(() => {
      const next = PREVIEW_ITEMS[(activeIndex + 1) % PREVIEW_ITEMS.length];
      setActiveId(next.id);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [activeIndex, isPlaying]);

  function selectItem(id: string) {
    setActiveId(id);
    setIsPlaying(false);
  }

  return (
    <div className="glass card-sheen rounded-[28px] p-3 sm:p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_212px] xl:items-center xl:gap-5">
        {/* The stage — the main image of the drop. It keeps the full width of
            the panel on narrow screens and only shares a row with the details
            once there is room for both. */}
        <div className="relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-2xl border border-paper/[0.08] bg-ink xl:mx-0 xl:max-w-none">
          <Image
            key={active.id}
            src={active.image}
            alt={`${active.name} — ${COLLECTION_COVER.title}`}
            fill
            preload
            sizes="(max-width: 1024px) 92vw, 620px"
            className="object-cover"
          />

          {/* Name chip, pinned to the top-left of the stage. */}
          <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-paper/10 bg-ink/70 px-2.5 py-1 backdrop-blur">
            {activeIndex === 0 ? (
              <span className="relative flex size-1.5 text-brand">
                <span className="live-dot absolute inline-flex size-1.5 rounded-full" />
                <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
              </span>
            ) : null}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper">
              {active.name}
            </span>
          </div>

          {/* Network mark, balancing the name chip on the opposite corner. */}
          <div className="absolute right-3 top-3 z-10">
            <NetworkBadge />
          </div>

          {/* Rotation control. Selecting a piece also pauses the slideshow. */}
          <button
            type="button"
            onClick={() => setIsPlaying((value) => !value)}
            className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-paper/10 bg-ink/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim backdrop-blur transition hover:border-brand/30 hover:text-paper"
            aria-label={
              isPlaying ? "Pause image rotation" : "Play image rotation"
            }
          >
            {isPlaying ? (
              <Pause className="size-3" />
            ) : (
              <Play className="size-3" />
            )}
            {isPlaying ? "Pause" : "Play"}
          </button>

          {/* Position in the set, bottom-right of the stage. */}
          <div className="absolute bottom-3 right-3 rounded-full border border-paper/10 bg-ink/70 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-paper-dim backdrop-blur">
            {String(activeIndex + 1).padStart(2, "0")}
            <span className="text-paper-mute"> / </span>
            {String(PREVIEW_ITEMS.length).padStart(2, "0")}
          </div>
        </div>

        {/* Details for the selected piece, plus the picker for the set. They
            stack under the stage and move into a single rail beside it once
            the stage has a column of its own. */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="min-w-0">
            <p className="eyebrow">{active.eyebrow}</p>
            <h2 className="mt-2.5 font-display text-[26px] font-extrabold leading-none tracking-[-0.03em] text-paper">
              {active.name}
            </h2>
            <p className="mt-2 text-[11px] text-paper-dim">
              {active.title} · {active.role}
            </p>
            <p className="mt-2.5 text-[11px] leading-5 text-paper-mute">
              {active.blurb}
            </p>
          </div>

          <div className="@container min-w-0 border-t border-paper/[0.07] pt-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper-mute">
              The set
            </p>
            <div
              className="mt-2.5 grid grid-cols-1 gap-2 @min-[320px]:grid-cols-2"
              role="tablist"
              aria-label="Collection preview"
            >
              {PREVIEW_ITEMS.map((item) => {
                const selected = item.id === active.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-label={`Preview ${item.name}`}
                    onClick={() => selectItem(item.id)}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-xl border p-1.5 text-left transition",
                      selected
                        ? "border-brand/50 bg-brand/[0.08]"
                        : "border-paper/[0.07] bg-paper/[0.02] hover:border-brand/30 hover:bg-paper/[0.05]",
                    )}
                  >
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-paper/[0.08] bg-ink">
                      <Image
                        src={item.image}
                        alt=""
                        loading="lazy"
                        width={144}
                        height={144}
                        className="size-full object-cover"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[11px] font-medium leading-4",
                          selected
                            ? "text-paper"
                            : "text-paper-dim group-hover:text-paper",
                        )}
                      >
                        {item.name}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[8px] uppercase tracking-[0.14em] text-paper-mute">
                        {item.role}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
