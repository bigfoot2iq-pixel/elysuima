import type { Address } from "viem";

export type EligibilityChain = {
  key: string;
  name: string;
  shortName: string;
  chainId: number;
  nativeSymbol: string;
  color: string;
  explorer: string;
  balance: string;
  balanceFormatted: string;
  ok: boolean;
  error: string | null;
};

export type EligibilityResponse = {
  address: Address;
  eligible: boolean;
  thresholdWei: string;
  thresholdFormatted: string;
  chains: EligibilityChain[];
  bestChain: string | null;
  allUnavailable: boolean;
  checkedAt: number;
};
