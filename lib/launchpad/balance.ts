import { parseUnits } from "viem";
import type { EligibilityChain } from "@/lib/eligibility-types";

/**
 * Minimum native-token balance a wallet must hold on a mainnet chain before it
 * can start a mint.
 *
 * The launchpad runs on Elysium testnet during pre-launch, so the mint chain
 * balance is not useful as a bot filter: testnet HYPE is free. Instead the mint
 * panel checks the shared five-chain mainnet balance service. The claim page
 * uses a narrower three-chain subset, but the launchpad keeps its own guard and
 * minimums.
 */
const MINIMUM_BALANCE_AMOUNTS = {
  HYPE: "0.06",
  ETH: "0.0025",
} as const;

const FALLBACK_MINIMUM_BALANCE = "0.0025";

/** Mainnet chains whose native balance can satisfy the mint requirement. */
export const MINT_MAINNET_CHAINS_LABEL =
  "Hyperliquid, HyperEVM, Ethereum, Base, or Ink";

/** Human-readable launchpad mainnet requirement, used before data loads. */
export const MINT_MAINNET_REQUIREMENT_LABEL =
  `${MINIMUM_BALANCE_AMOUNTS.HYPE} HYPE or ${MINIMUM_BALANCE_AMOUNTS.ETH} ETH`;

export type MintMainnetCheck = {
  /** At least one mainnet chain met the launchpad minimum. */
  eligible: boolean;
  /** The first mainnet chain that met the requirement. */
  bestChain: EligibilityChain | null;
  /** Minimum required on `bestChain`, in wei. */
  required: bigint | null;
  /** Requirement copy for empty, loading, and error states. */
  requirementLabel: string;
};

export function getMintMinimumBalance(
  nativeSymbol: string,
  decimals = 18,
): bigint {
  const amount =
    MINIMUM_BALANCE_AMOUNTS[
      nativeSymbol.toUpperCase() as keyof typeof MINIMUM_BALANCE_AMOUNTS
    ] ?? FALLBACK_MINIMUM_BALANCE;

  return parseUnits(amount, decimals);
}

/**
 * Finds the first mainnet chain where the wallet holds enough native ETH or
 * HYPE. The eligibility response already contains balances for Hyperliquid,
 * HyperEVM, Ethereum, Base, and Ink; this function applies the launchpad's own
 * per-token minimum instead of the claim threshold.
 */
export function evaluateMintMainnetEligibility(
  chains: EligibilityChain[] | undefined,
): MintMainnetCheck {
  if (!chains || chains.length === 0) {
    return {
      eligible: false,
      bestChain: null,
      required: null,
      requirementLabel: MINT_MAINNET_REQUIREMENT_LABEL,
    };
  }

  for (const chain of chains) {
    if (chain.error) continue;

    let balance: bigint;
    try {
      balance = BigInt(chain.balance);
    } catch {
      continue;
    }

    const required = getMintMinimumBalance(chain.nativeSymbol);
    if (balance >= required) {
      return {
        eligible: true,
        bestChain: chain,
        required,
        requirementLabel: MINT_MAINNET_REQUIREMENT_LABEL,
      };
    }
  }

  return {
    eligible: false,
    bestChain: null,
    required: null,
    requirementLabel: MINT_MAINNET_REQUIREMENT_LABEL,
  };
}
