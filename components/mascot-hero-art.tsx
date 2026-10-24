import { cn } from "@/lib/utils";
import { HERO_MASCOT_ID, getMascot, MASCOT_GLOWS } from "@/lib/mascots";

export function MascotHeroArt({
  mascotId = HERO_MASCOT_ID,
  className,
  priority = false,
}: {
  mascotId?: string;
  className?: string;
  priority?: boolean;
}) {
  const mascot = getMascot(mascotId);
  const glow = MASCOT_GLOWS[mascot.accent];

  return (
    <div
      className={cn(
        "relative isolate aspect-square w-full overflow-hidden",
        className,
      )}
    >
      {/* Ambient halo behind the character */}
      <div
        aria-hidden="true"
        className="absolute inset-[8%] rounded-full blur-[70px]"
        style={{ background: glow }}
      />

      {/* Concentric orbit rings */}
      <div
        aria-hidden="true"
        className="absolute inset-[6%] rounded-full border border-paper/[0.07]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-[17%] rounded-full border border-brand/15"
      />
      <div
        aria-hidden="true"
        className="animate-spin-slow absolute inset-[28%] rounded-full border border-dashed border-paper/[0.09]"
      />

      {/* Travelling node on the orbit */}
      <div aria-hidden="true" className="absolute inset-[28%]">
        <span className="absolute -top-[3px] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand shadow-[0_0_14px_rgba(52,183,221,0.9)]" />
      </div>

      {/* The character itself. The source art is a dark square, so it fades
          into the page instead of showing a visible container edge. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mascot.image}
        alt={`${mascot.name} — ${mascot.title}`}
        {...(priority ? { fetchPriority: "high" as const } : {})}
        className="absolute inset-0 size-full object-cover object-[50%_34%] [mask-image:radial-gradient(circle_at_50%_38%,black_58%,transparent_74%)]"
      />

      {/* Bottom fade into the card */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink via-ink/60 to-transparent"
      />
    </div>
  );
}