import Image from "next/image";
import { cn } from "@/lib/utils";
import { HERO_MASCOT_ID, getMascot, MASCOT_GLOWS } from "@/lib/mascots";

export function MascotHeroArt({
  mascotId = HERO_MASCOT_ID,
  className,
  preload = false,
  sizes = "(max-width: 1024px) 92vw, 620px",
  zoom = 1,
}: {
  mascotId?: string;
  className?: string;
  preload?: boolean;
  sizes?: string;
  /**
   * Scales the character inside the frame. The art is composed with the head in
   * the upper half, so a zoom around that same point keeps the face framed
   * while the body falls away into the fade.
   */
  zoom?: number;
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
      <Image
        src={mascot.image}
        alt={`${mascot.name} — ${mascot.title}`}
        fill
        sizes={sizes}
        {...(preload ? { preload: true } : {})}
        className="absolute inset-0 size-full object-cover object-[50%_34%] [mask-image:radial-gradient(circle_at_50%_38%,black_58%,transparent_74%)]"
        style={
          zoom === 1
            ? undefined
            : { transform: `scale(${zoom})`, transformOrigin: "50% 38%" }
        }
      />

      {/* Bottom fade into the card */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink via-ink/60 to-transparent"
      />
    </div>
  );
}
