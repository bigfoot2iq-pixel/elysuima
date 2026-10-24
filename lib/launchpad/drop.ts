import { parseUnits } from "viem";
import type {
  ContractInspection,
  PublicLaunchpadConfig,
} from "./types";

/**
 * The price of a single token for the phase that is currently live. The
 * on-chain value wins over the saved settings, because the contract rejects
 * any payment that does not match its own price.
 */
export function getUnitPrice(
  config: PublicLaunchpadConfig,
  inspection: ContractInspection | undefined,
): bigint {
  const drop = inspection?.elyziumaDrop;
  if (drop) {
    try {
      return BigInt(drop.publicPrice);
    } catch {
      return 0n;
    }
  }

  if (inspection?.seaDrop) {
    try {
      return BigInt(inspection.seaDrop.mintPrice);
    } catch {
      return 0n;
    }
  }

  try {
    return parseUnits(config.mintPrice || "0", 18);
  } catch {
    return 0n;
  }
}

/**
 * The number of tokens a single wallet may still mint in the live phase.
 */
export function getPerWalletLimit(
  config: PublicLaunchpadConfig,
  inspection: ContractInspection | undefined,
): number {
  const drop = inspection?.elyziumaDrop;
  if (drop) {
    return drop.maxPerWallet > 0 ? drop.maxPerWallet : config.maxPerWallet;
  }

  const seaDropLimit = inspection?.seaDrop?.maxPerWallet ?? 0;
  return Math.max(
    1,
    Math.min(
      config.maxPerWallet,
      seaDropLimit > 0 ? seaDropLimit : config.maxPerWallet,
    ),
  );
}
