import Image from "next/image";
import { LINKS } from "@/lib/config";
import { cn } from "@/lib/utils";
import { VerifiedBadge, XLogo } from "./x-logo";

/**
 * The header's link to the collection's X account.
 *
 * X is the only other brand on the site, so instead of the flat white pill it
 * used to be, the button borrows X's own blue — lit from the top-left by the
 * same cyan the mascot art glows with — so it stays legible against the near
 * black header without fighting the site palette.
 *
 * The account's own avatar leads the pill and carries the verified badge on
 * its shoulder, the way X itself shows it. The badge keeps its official blue
 * but is ringed in paper white, because a blue mark on a blue button — or one
 * lost in the mascot art — would otherwise disappear.
 */
export function XAccountLink({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <a
      href={LINKS.x}
      target="_blank"
      rel="noreferrer"
      aria-label="Elyziumaa on X, verified account"
      className={cn(
        "x-account group/x inline-flex h-11 shrink-0 items-center gap-2.5 rounded-full pl-2 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft/80 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        className,
      )}
    >
      <span className="relative shrink-0">
        <span className="relative block size-[30px] overflow-hidden rounded-full ring-2 ring-paper">
          <Image
            src="/brand/x-avatar.jpg"
            alt=""
            width={30}
            height={30}
            preload
            className="size-full object-cover"
          />
        </span>
        <span
          className="absolute -bottom-[2px] -right-[2px] grid place-items-center"
          aria-hidden="true"
        >
          <VerifiedBadge className="x-account-badge size-[12px] rounded-full" />
        </span>
      </span>

      <span
        className={cn(
          "x-account-label",
          showLabel ? "inline" : "hidden xl:inline",
        )}
      >
        Elyziumaa
      </span>

      <XLogo className="size-[15px] shrink-0 text-white/90 transition-transform duration-300 group-hover/x:scale-110" />
    </a>
  );
}
