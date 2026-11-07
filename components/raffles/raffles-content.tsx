import { ACTIVE_RAFFLES, ENDED_RAFFLES } from "@/lib/raffles";
import { RaffleCard } from "./raffle-card";

const liveCount = ACTIVE_RAFFLES.length;
const endedCount = ENDED_RAFFLES.length;
const entryFee = ACTIVE_RAFFLES[0]?.entryFee ?? 10;

const STEPS = [
  {
    index: "01",
    title: `Enter for ${entryFee} ELYZ`,
    copy: "One entry per wallet, per draw.",
  },
  {
    index: "02",
    title: "Watch the timer",
    copy: "Entries close at zero.",
  },
  {
    index: "03",
    title: "One winner",
    copy: "The NFT leaves with one wallet.",
  },
] as const;

export function RafflesContent() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="animate-breathe absolute -top-40 right-[10%] size-[420px] rounded-full bg-brand/[0.13] blur-[120px]" />
          <div className="absolute -left-40 top-1/2 size-[320px] rounded-full bg-beak/[0.05] blur-[130px]" />
        </div>

        <div className="section-shell relative pb-3 pt-6 sm:pt-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl animate-rise">
              <span className="eyebrow">Elyziuma raffles</span>
              <h1 className="mt-3 font-display text-[clamp(2rem,3.6vw,3rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-paper">
                Win an <span className="text-gradient">Elyziuma.</span>
              </h1>
              <p className="mt-2.5 max-w-xl text-[13px] leading-6 text-paper-dim">
                One NFT, one winner. Enter for{" "}
                <span className="font-mono text-paper">{entryFee} ELYZ</span>{" "}
                before the timer hits zero.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {liveCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/20 bg-mint/[0.06] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-mint">
                  <span className="live-dot" />
                  {liveCount} live draw{liveCount === 1 ? "" : "s"}
                </span>
              ) : null}
              {endedCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-paper/10 bg-paper/[0.03] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-paper-dim">
                  <span className="size-1.5 rounded-full bg-paper-mute" />
                  {endedCount} ended
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell pb-4" aria-label="Raffles">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIVE_RAFFLES.map((raffle) => (
            <RaffleCard key={raffle.id} raffle={raffle} />
          ))}
          {ENDED_RAFFLES.map((raffle) => (
            <RaffleCard key={raffle.id} raffle={raffle} />
          ))}
        </div>

        <div className="mt-2 grid gap-px overflow-hidden rounded-2xl border border-paper/[0.07] bg-paper/[0.06] sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.index} className="bg-ink/70 px-4 py-1.5">
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-brand">
                {step.index}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-paper">
                {step.title}
              </p>
              <p className="mt-0.5 text-[9px] leading-4 text-paper-mute">
                {step.copy}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-paper-mute/70">
          UI preview · no wallet or contract connection
        </p>
      </section>
    </>
  );
}
