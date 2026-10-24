import { cn } from "@/lib/utils";
import { MASCOTS, MASCOT_GLOWS, type Mascot } from "@/lib/mascots";

export function MascotAvatar({
  mascot,
  size = 44,
  className,
}: {
  mascot: Mascot;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-paper/10 bg-ink-2",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mascot.image}
        alt={mascot.name}
        loading="lazy"
        width={size}
        height={size}
        className="size-full object-cover object-[50%_22%]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: `inset 0 -${Math.round(size * 0.35)}px ${Math.round(
            size * 0.45,
          )}px -${Math.round(size * 0.18)}px ${MASCOT_GLOWS[mascot.accent]}`,
        }}
      />
    </span>
  );
}

export function MascotAvatarRow({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <ul className={cn("flex items-center", className)}>
      {MASCOTS.map((mascot, index) => (
        <li key={mascot.id} className={index > 0 ? "-ml-2.5" : undefined}>
          <MascotAvatar
            mascot={mascot}
            size={size}
            className="ring-2 ring-ink transition-transform duration-300 hover:-translate-y-0.5 hover:z-10"
          />
        </li>
      ))}
    </ul>
  );
}