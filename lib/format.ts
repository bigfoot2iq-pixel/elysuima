import { formatUnits } from "viem";

export function shortAddress(address?: string | null, chars = 4) {
  if (!address) return "—";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function formatAmount(
  value: bigint | undefined,
  decimals = 18,
  maximumFractionDigits = 2,
) {
  if (value === undefined) return "—";
  const numeric = Number(formatUnits(value, decimals));
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(numeric);
}

export function formatCompact(value: bigint | undefined, decimals = 18) {
  if (value === undefined) return "—";
  const numeric = Number(formatUnits(value, decimals));
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numeric);
}

export function formatEth(value: bigint | undefined, maximumFractionDigits = 4) {
  if (value === undefined) return "—";
  return `${formatAmount(value, 18, maximumFractionDigits)} ETH`;
}

export function formatCountdown(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

/**
 * Like formatCountdown, but spells out the unit of every visible part so a
 * compact timer does not look like an ambiguous "00:41:28". Zero-leading
 * units are omitted, except that the largest visible unit is always shown.
 */
export function formatCountdownUnits(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const secs = total % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (days > 0 || hours > 0) parts.push(`${hours}h`);
  if (days > 0 || hours > 0 || minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

export function formatRelative(timestampSeconds: number, nowSeconds?: number) {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestampSeconds);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3_600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3_600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}

export function formatPercent(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits,
  }).format(value);
}
