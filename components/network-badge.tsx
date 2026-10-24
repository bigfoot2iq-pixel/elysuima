import { cn } from "@/lib/utils";

/**
 * Small "verified network" mark. The check sits in a blue coin so the badge
 * reads at a glance on top of artwork, while the pill keeps contrast over
 * bright or dark areas of the image.
 */
export function NetworkBadge({
  label = "Elysium",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 font-mono text-xs text-paper backdrop-blur-md",
        className,
      )}
    >
      <span className="flex size-4 items-center justify-center rounded-full bg-gradient-to-r from-brand-soft to-brand text-ink">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-2.5"
          aria-hidden="true"
        >
          <path d="m5 13 4 4L19 7" />
        </svg>
      </span>
      {label}
    </span>
  );
}
