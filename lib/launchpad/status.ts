import type {
  ContractInspection,
  PublicLaunchpadConfig,
} from "./types";

export type DropStatusTone = "mint" | "brand" | "warn" | "danger" | "muted";

export type DropStatus = {
  tone: DropStatusTone;
  label: string;
  detail: string;
};

function bigintOrUndefined(value?: string) {
  if (!value) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

export function getSupplyState(
  config: PublicLaunchpadConfig,
  inspection?: ContractInspection,
) {
  const totalSupply = bigintOrUndefined(inspection?.totalSupply);
  const inspectedMax = bigintOrUndefined(inspection?.maxSupply);
  const configuredMax =
    config.maxSupply > 0 ? BigInt(config.maxSupply) : undefined;
  // A readable on-chain cap wins, including an explicit zero (open supply).
  // The saved setting is only a fallback when the collection did not report a
  // cap at all.
  const maxSupply =
    inspection?.maxSupply !== undefined
      ? inspectedMax && inspectedMax > 0n
        ? inspectedMax
        : undefined
      : configuredMax;

  if (!maxSupply || maxSupply === 0n) {
    return { totalSupply, maxSupply: undefined, remaining: undefined };
  }

  // Without a total we cannot tell how much is left. Do not report the full
  // cap as remaining; the caller shows an em dash instead.
  if (totalSupply === undefined) {
    return { totalSupply, maxSupply, remaining: undefined };
  }

  const remaining = maxSupply > totalSupply ? maxSupply - totalSupply : 0n;

  return { totalSupply, maxSupply, remaining };
}

export function getDropStatus(
  config: PublicLaunchpadConfig,
  inspection: ContractInspection | undefined,
  nowSeconds: number,
): DropStatus {
  if (!config.enabled) {
    return {
      tone: "muted",
      label: "Closed",
      detail: "The owner has paused minting.",
    };
  }

  if (!config.collectionAddress) {
    return {
      tone: "warn",
      label: "Setup",
      detail: "The collection address has not been configured yet.",
    };
  }

  // The admin schedule is a UI gate: the page stays visible and only the mint
  // button counts down, so the status pill should still read as scheduled.
  if (config.startAt > 0 && nowSeconds < config.startAt) {
    return {
      tone: "brand",
      label: "Scheduled",
      detail: "The mint has not opened yet.",
    };
  }

  if (inspection && !inspection.ok) {
    return {
      tone: "warn",
      label: "Unavailable",
      detail: inspection.message ?? "The collection could not be read.",
    };
  }

  // The collection exposes its price and phase on-chain, but this read did not
  // return them. Do not guess "Live" from the saved settings.
  if (inspection?.elyziumaDropError) {
    return {
      tone: "warn",
      label: "Unavailable",
      detail:
        "The on-chain price and mint phase could not be read. Retrying…",
    };
  }

  const { remaining } = getSupplyState(config, inspection);
  const soldOut = remaining === 0n;

  // The Elyziuma collection keeps its phase on-chain, so the contract is the
  // source of truth for what is live right now.
  const drop = inspection?.elyziumaDrop;
  if (drop) {
    if (soldOut) {
      return {
        tone: "danger",
        label: "Sold out",
        detail: "The maximum supply has been reached.",
      };
    }
    if (drop.publicMintOpen) {
      return {
        tone: "mint",
        label: "Live",
        detail: "The public mint is open.",
      };
    }
    return {
      tone: "muted",
      label: "Closed",
      detail: "The owner has not opened the public mint.",
    };
  }

  const seaDrop = inspection?.seaDrop;
  if (seaDrop) {
    if (seaDrop.startTime > 0 && nowSeconds < seaDrop.startTime) {
      return {
        tone: "brand",
        label: "Scheduled",
        detail: "The public mint has not opened yet.",
      };
    }
    if (seaDrop.endTime > 0 && nowSeconds >= seaDrop.endTime) {
      return {
        tone: "muted",
        label: "Ended",
        detail: "The public mint window has closed.",
      };
    }
  }

  if (soldOut) {
    return {
      tone: "danger",
      label: "Sold out",
      detail: "The maximum supply has been reached.",
    };
  }

  return {
    tone: "mint",
    label: "Live",
    detail: "The public mint is open.",
  };
}
