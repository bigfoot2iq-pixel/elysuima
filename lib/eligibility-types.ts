import type { Address } from "viem";

export type EligibilityChain = {
  key: string;
  name: string;
  shortName: string;
  chainId: number;
  nativeSymbol: string;
  minBalance: string;
  thresholdWei: string;
  thresholdFormatted: string;
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
  chains: EligibilityChain[];
  bestChain: string | null;
  allUnavailable: boolean;
  checkedAt: number;
};
