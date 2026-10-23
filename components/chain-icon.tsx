import { cn } from "@/lib/utils";

export function ChainIcon({
  chainKey,
  size = 36,
  className,
}: {
  chainKey: string;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 40 40",
    fill: "none",
    "aria-hidden": true as const,
    className: cn("shrink-0", className),
  };

  if (chainKey === "ethereum") {
    return (
      <svg {...common}>
        <rect width="40" height="40" rx="12" fill="#8A92B2" fillOpacity="0.12" />
        <path d="M20 7L11.5 21.2L20 26.2L28.5 21.2L20 7Z" fill="#C8CFE8" />
        <path d="M11.5 23.2L20 33L28.5 23.2L20 28.1L11.5 23.2Z" fill="#8A92B2" />
      </svg>
    );
  }

  if (chainKey === "base") {
    return (
      <svg {...common}>
        <rect width="40" height="40" rx="12" fill="#0052FF" fillOpacity="0.14" />
        <circle cx="20" cy="20" r="10.5" fill="#0052FF" />
        <rect x="13" y="18.4" width="14" height="3.2" rx="1.6" fill="#F8F7F4" />
      </svg>
    );
  }

  if (chainKey === "abstract") {
    return (
      <svg {...common}>
        <rect width="40" height="40" rx="12" fill="#C7F9FF" fillOpacity="0.12" />
        <rect x="8" y="8" width="24" height="24" rx="8" fill="#C7F9FF" fillOpacity="0.16" />
        <path
          d="M13 27L20 12L27 27"
          stroke="#C7F9FF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M16 22H24" stroke="#C7F9FF" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect width="40" height="40" rx="12" fill="#7B61FF" fillOpacity="0.14" />
      <path
        d="M10 25.5C13 19.5 17 17 21 20C25 23 28 22 31 15"
        stroke="#A997FF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M10 30C14 25 18 24 22 27C26 30 29 29 32 24"
        stroke="#7B61FF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
