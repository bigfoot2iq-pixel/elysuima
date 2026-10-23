import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CountdownRing({
  remaining,
  total = 86_400,
  size = 124,
  strokeWidth = 5,
  ready = false,
  className,
}: {
  remaining: number;
  total?: number;
  size?: number;
  strokeWidth?: number;
  ready?: boolean;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = ready
    ? 1
    : Math.min(1, Math.max(0, 1 - remaining / total));
  const offset = circumference * (1 - progress);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="timer"
      aria-label={ready ? "Ready to claim" : `Next claim in ${formatCountdown(remaining)}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(248,247,244,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ready ? "#7DF0C4" : "#34B7DD"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          style={{
            filter: ready
              ? "drop-shadow(0 0 8px rgba(125,240,196,0.55))"
              : "drop-shadow(0 0 6px rgba(52,183,221,0.35))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-mono text-[9px] uppercase tracking-[0.2em]",
            ready ? "text-mint" : "text-paper-dim",
          )}
        >
          {ready ? "Status" : "Next claim"}
        </span>
        <span
          className={cn(
            "mt-1 font-mono text-[15px] font-medium tracking-tight",
            ready ? "text-mint" : "text-paper",
          )}
        >
          {ready ? "Ready" : formatCountdown(remaining)}
        </span>
        {!ready && (
          <span className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-paper-dim/60">
            remaining
          </span>
        )}
      </div>
    </div>
  );
}
