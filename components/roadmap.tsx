import { Coins, Sparkles, Ticket } from "lucide-react";

type Phase = {
  id: string;
  phase: string;
  title: string;
  status: "Live" | "Next" | "Planned";
  icon: typeof Sparkles;
  body: string[];
  notes: string[];
  accent: "brand" | "mint" | "warn";
};

const PHASES: Phase[] = [
  {
    id: "01",
    phase: "Phase 1",
    title: "The Collection",
    status: "Live",
    icon: Sparkles,
    accent: "brand",
    body: [
      "Our first step is to launch 2,222 unique NFTs and build a strong community around Elyziuma.",
      "Our goal isn't simply to sell out and stop there. The collection is the foundation for everything we want to build next.",
    ],
    notes: ["2,222 unique NFTs", "Community first"],
  },
  {
    id: "02",
    phase: "Phase 2",
    title: "The First Raffle Platform on Elysium",
    status: "Next",
    icon: Ticket,
    accent: "mint",
    body: [
      "After the collection, our goal is to build the first raffle platform on Elysium.",
      "The idea is simple: create a platform where the community can participate in raffles and have a real reason to stay involved.",
      "Elyziuma holders will have free access to participate in upcoming raffles.",
      "We want holding an Elyziuma to mean more than simply owning an NFT. We want our holders to be part of what we're building.",
    ],
    notes: ["First raffle platform", "Free access for holders"],
  },
  {
    id: "03",
    phase: "Phase 3",
    title: "Our Ecosystem",
    status: "Planned",
    icon: Coins,
    accent: "warn",
    body: [
      "As the project grows, we plan to introduce our own token and explore ways to give back to the people who supported us from the beginning, including potential holder airdrops and ecosystem benefits.",
    ],
    notes: ["Our own token", "Holder airdrops", "Ecosystem benefits"],
  },
];

const ACCENTS = {
  brand: {
    marker: "border-brand/35 bg-brand/10 text-brand",
    rail: "from-brand/40 to-brand/10",
    chip: "border-brand/25 bg-brand/[0.07] text-brand",
  },
  mint: {
    marker: "border-mint/35 bg-mint/10 text-mint",
    rail: "from-mint/40 to-mint/10",
    chip: "border-mint/25 bg-mint/[0.07] text-mint",
  },
  warn: {
    marker: "border-warn/35 bg-warn/10 text-warn",
    rail: "from-warn/40 to-warn/10",
    chip: "border-warn/25 bg-warn/[0.07] text-warn",
  },
} as const;

const STATUS_TONE = {
  Live: "border-mint/25 bg-mint/[0.07] text-mint",
  Next: "border-brand/25 bg-brand/[0.07] text-brand",
  Planned: "border-paper/10 bg-paper/[0.03] text-paper-mute",
} as const;

export function Roadmap() {
  return (
    <section
      id="roadmap"
      className="section-shell scroll-mt-28 pb-16 sm:pb-24"
      aria-labelledby="roadmap-title"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Roadmap</p>
          <h2
            id="roadmap-title"
            className="mt-4 max-w-xl font-display text-3xl font-extrabold tracking-[-0.04em] text-paper sm:text-4xl"
          >
            Built in phases,
            <span className="block text-paper-dim">never in promises.</span>
          </h2>
        </div>
        <p className="max-w-sm text-xs leading-6 text-paper-mute">
          Everything will be built step by step. No empty promises — just a
          long-term vision.
        </p>
      </div>

      <div className="mt-10 grid gap-y-8 md:grid-cols-3 md:gap-x-6">
        {PHASES.map((phase) => {
          const accent = ACCENTS[phase.accent];
          const Icon = phase.icon;

          return (
            <div key={phase.id} className="relative">
              {/* Timeline rail: a marker per phase, joined by a hairline on desktop. */}
              <div className="mb-5 flex items-center md:mb-6">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] tracking-[0.06em] ${accent.marker}`}
                >
                  {phase.id}
                </span>
                <span
                  aria-hidden="true"
                  className={`hidden h-px flex-1 bg-gradient-to-r md:block ${accent.rail}`}
                />
              </div>

              <article className="ink-panel group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition hover:border-brand/35">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper-mute">
                      {phase.phase}
                    </p>
                    <h3 className="mt-2 font-display text-xl font-extrabold leading-tight tracking-[-0.03em] text-paper">
                      {phase.title}
                    </h3>
                  </div>
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${accent.marker}`}
                  >
                    <Icon className="size-4" />
                  </span>
                </div>

                <div className="mt-5 space-y-3 pb-6">
                  {phase.body.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-[12px] leading-6 text-paper-dim"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                <ul className="mt-auto flex flex-wrap gap-2 border-t border-paper/[0.07] pt-5">
                  {phase.notes.map((note) => (
                    <li
                      key={note}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${accent.chip}`}
                    >
                      {note}
                    </li>
                  ))}
                </ul>

                <span
                  className={`mt-5 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${STATUS_TONE[phase.status]}`}
                >
                  {phase.status === "Live" && <span className="live-dot" />}
                  {phase.status}
                </span>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}
