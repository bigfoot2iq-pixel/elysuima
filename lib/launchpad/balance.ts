import { parseUnits } from "viem";

/**
 * Minimum native-token balance a wallet should hold before it starts a mint.
 *
 * This is a client-side guard: it stops visitors from submitting a mint that
 * cannot pay for the token plus gas. The contract remains the final authority,
 * so the check is deliberately simple and easy to update.
 */
const MINIMUM_BALANCE_AMOUNTS = {
  HYPE: "0.06",
  ETH: "0.0025",
} as const;

const FALLBACK_MINIMUM_BALANCE = "0.0025";

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
 * What the wallet needs before minting: the minimum balance, raised to the
 * mint total when the selected quantity costs more. That keeps the guard
 * correct if the drop starts charging for tokens.
 */
export function getMintRequiredBalance(
  nativeSymbol: string,
  mintTotal: bigint,
  decimals = 18,
): bigint {
  const minimum = getMintMinimumBalance(nativeSymbol, decimals);
  return mintTotal > minimum ? mintTotal : minimum;
}
