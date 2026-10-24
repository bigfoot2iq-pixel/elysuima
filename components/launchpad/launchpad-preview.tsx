"use client";

import Image from "next/image";
import { useState } from "react";
import { COLLECTION_COVER, getMascot, MASCOTS } from "@/lib/mascots";
import { cn } from "@/lib/utils";
import { MascotHeroArt } from "../mascot-hero-art";

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
  /** Set for the individual characters. The cover art renders as a plain image. */
  mascotId?: string;
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
    image: mascot.image,
    eyebrow: mascot.rarity,
    role: mascot.role,
    title: mascot.title,
    blurb: mascot.blurb,
    mascotId: mascot.id,
  })),
];

/**
 * The main image for the drop. The stage takes the full width of its column so
 * the artwork reads as the headline of the page, with the set listed beside it
 * as a picker. Selecting a piece swaps the hero art.
 */
export function LaunchpadPreview() {
  const [activeId, setActiveId] = useState<string>(PREVIEW_ITEMS[0].id);
  const active =
    PREVIEW_ITEMS.find((item) => item.id === activeId) ?? PREVIEW_ITEMS[0];
  const activeMascot = active.mascotId ? getMascot(active.mascotId) : undefined;
  const activeIndex = Math.max(
    0,
    PREVIEW_ITEMS.findIndex((item) => item.id === active.id),
  );

  return (
    <div className="glass card-sheen rounded-[28px] p-3 sm:p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_212px] xl:items-center xl:gap-5">
        {/* The stage — the main image of the drop. It keeps the full width of
            the panel on narrow screens and only shares a row with the details
            once there is room for both. */}
        <div className="relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-2xl border border-paper/[0.08] bg-ink xl:mx-0 xl:max-w-none">
          {activeMascot ? (
            <MascotHeroArt
              key={active.id}
              mascotId={activeMascot.id}
              preload
              zoom={1.25}
            />
          ) : (
            <Image
              key={active.id}
              src={active.image}
              alt={`${active.name} — ${COLLECTION_COVER.title}`}
              fill
              preload
              sizes="(max-width: 1024px) 92vw, 620px"
              className="object-cover"
            />
          )}

          {/* Name chip, pinned to the top-left of the stage. */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-paper/10 bg-ink/70 px-2.5 py-1 backdrop-blur">
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
                    onClick={() => setActiveId(item.id)}
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
                        className={cn(
                          "size-full object-cover",
                          item.mascotId
                            ? "scale-[2] origin-[50%_25%]"
                            : "object-center",
                        )}
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
