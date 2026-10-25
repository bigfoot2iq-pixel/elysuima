import { cn } from "@/lib/utils";
import { VerifiedBadge } from "./x-logo";

/**
 * Small "verified art" mark that sits on top of the main artwork. The X-style
 * seal reads instantly as a check of authenticity, while the pill keeps
 * contrast over bright or dark areas of the image.
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
      <span
        aria-hidden="true"
        className="flex size-4 shrink-0 items-center justify-center text-[#1d9bf0] drop-shadow-[0_0_6px_rgba(29,155,240,0.65)]"
      >
        <VerifiedBadge className="size-4" />
      </span>
      {label}
    </span>
  );
}
