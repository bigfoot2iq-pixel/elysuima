import Image from "next/image";
import { cn } from "@/lib/utils";

export function TokenMark({
  size = 40,
  className,
  glow = false,
  rounded = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
  rounded?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        rounded && "rounded-[30%]",
        glow && "ring-1 ring-brand/25 drop-shadow-[0_0_20px_rgba(52,183,221,0.35)]",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/brand/elyziuma-logo.png"
        alt=""
        width={size}
        height={size}
        preload
        className="size-full object-cover"
      />
    </span>
  );
}