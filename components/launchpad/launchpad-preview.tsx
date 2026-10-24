"use client";

import { useState } from "react";
import { COLLECTION_COVER, getMascot, MASCOTS } from "@/lib/mascots";
import { MascotHeroArt } from "../mascot-hero-art";

type PreviewItem = {
  id: string;
  name: string;
  image: string;
  /** Set for the individual characters. The cover art renders as a plain image. */
  mascotId?: string;
};

const PREVIEW_ITEMS: PreviewItem[] = [
  {
    id: COLLECTION_COVER.id,
    name: COLLECTION_COVER.name,
    image: COLLECTION_COVER.image,
  },
  ...MASCOTS.map((mascot) => ({
    id: mascot.id,
    name: mascot.name,
    image: mascot.image,
    mascotId: mascot.id,
  })),
];

/**
 * The single preview image for the drop, with the rest of the set as small
 * thumbnails underneath. Selecting a thumbnail swaps the hero art.
 */
export function LaunchpadPreview() {
  const [activeId, setActiveId] = useState<string>(PREVIEW_ITEMS[0].id);
  const active =
    PREVIEW_ITEMS.find((item) => item.id === activeId) ?? PREVIEW_ITEMS[0];
  const activeMascot = active.mascotId ? getMascot(active.mascotId) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[380px] flex-col gap-2.5">
      <div className="card-sheen glass relative overflow-hidden rounded-2xl p-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl">
          {activeMascot ? (
            <MascotHeroArt
              key={active.id}
              mascotId={activeMascot.id}
              priority
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={active.id}
              src={active.image}
              alt={`${active.name} — ${COLLECTION_COVER.title}`}
              fetchPriority="high"
              className="size-full object-cover"
            />
          )}
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-ink/70 px-2.5 py-1 backdrop-blur">
            {active.id === PREVIEW_ITEMS[0].id ? (
              <span className="relative flex size-1.5 text-brand">
                <span className="live-dot absolute inline-flex size-1.5 rounded-full" />
                <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
              </span>
            ) : null}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper">
              {active.name}
            </span>
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-6 gap-2"
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
              className={`relative aspect-square overflow-hidden rounded-lg border transition ${
                selected
                  ? "border-brand/60 opacity-100"
                  : "border-paper/10 opacity-55 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt=""
                loading="lazy"
                className={`size-full object-cover ${
                  item.mascotId ? "object-[50%_24%]" : "object-center"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
