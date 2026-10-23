import { cn } from "@/lib/utils";

export function TokenMark({
  size = 40,
  className,
  glow = false,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        glow && "drop-shadow-[0_0_22px_rgba(52,183,221,0.45)]",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={size} height={size} fill="none">
        <defs>
          <linearGradient id="elyz-mark-gradient" x1="8" y1="4" x2="56" y2="60">
            <stop stopColor="#7CD8F2" />
            <stop offset="0.55" stopColor="#34B7DD" />
            <stop offset="1" stopColor="#2D7388" />
          </linearGradient>
          <linearGradient id="elyz-mark-shine" x1="20" y1="8" x2="42" y2="30">
            <stop stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M32 4.5C32 4.5 11 26.2 11 39.4C11 51.3 20.4 59.5 32 59.5C43.6 59.5 53 51.3 53 39.4C53 26.2 32 4.5 32 4.5Z"
          fill="url(#elyz-mark-gradient)"
        />
        <path
          d="M32 4.5C32 4.5 11 26.2 11 39.4C11 51.3 20.4 59.5 32 59.5C43.6 59.5 53 51.3 53 39.4C53 26.2 32 4.5 32 4.5Z"
          stroke="rgba(4,24,28,0.24)"
          strokeWidth="1.5"
        />
        <path
          d="M22 27.5H42M22 36H35.5M22 44.5H42"
          stroke="#04181C"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M22 27.5V44.5"
          stroke="#04181C"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M20 12C16 20 14 28 14 35C14 41 16 46 20 50"
          stroke="url(#elyz-mark-shine)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    </span>
  );
}
