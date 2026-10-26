"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAccount, useReadContracts } from "wagmi";
import { useClaimEligibility } from "@/hooks/use-claim-eligibility";
import { useEligibility } from "@/hooks/use-eligibility";
import { tokenAbi } from "@/lib/abis";
import {
  CLAIM_ADDRESS,
  IS_CONFIGURED,
  SITE_URL,
  TOKEN_ADDRESS,
  TOKEN_FALLBACK,
} from "@/lib/config";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function useClaimDataValue() {
  const { address, chainId, connector } = useAccount();
  const eligibility = useEligibility(address);
  const claimEligibility = useClaimEligibility(address);
  const [addedToken, setAddedToken] = useState(false);

  const { data: tokenData, refetch: refetchToken } = useReadContracts({
    contracts: [
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "symbol",
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "decimals",
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [address ?? ZERO_ADDRESS],
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [CLAIM_ADDRESS],
      },
    ],
    query: {
      enabled: IS_CONFIGURED,
      refetchInterval: 15_000,
    },
    allowFailure: true,
  });

  const [
    symbolResult,
    decimalsResult,
    userBalanceResult,
    claimBalanceResult,
  ] = tokenData ?? [];

  const symbol =
    symbolResult?.status === "success"
      ? (symbolResult.result as string)
      : TOKEN_FALLBACK.symbol;
  const decimals =
    decimalsResult?.status === "success"
      ? Number(decimalsResult.result)
      : TOKEN_FALLBACK.decimals;
  const userBalance =
    userBalanceResult?.status === "success"
      ? (userBalanceResult.result as bigint)
      : undefined;
  const claimBalance =
    claimBalanceResult?.status === "success"
      ? (claimBalanceResult.result as bigint)
      : undefined;

  const data = claimEligibility.data;
  const nft = data?.nft;
  const community = data?.community;
  const paused = data?.paused ?? false;
  const thresholdEligible = eligibility.data?.eligible ?? false;
  const checking =
    Boolean(address) && eligibility.isLoading && !eligibility.data;

  function refresh() {
    void claimEligibility.refetch();
    void eligibility.refetch();
    void refetchToken();
  }

  async function addToken() {
    if (!connector || !IS_CONFIGURED || addedToken) return;

    try {
      const provider = (await connector.getProvider()) as {
        request: (args: { method: string; params?: unknown }) => Promise<unknown>;
      };

      await provider.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: TOKEN_ADDRESS,
            symbol,
            decimals,
            image: `${SITE_URL}/token.svg`,
          },
        },
      });

      setAddedToken(true);
      toast.success("ELYZ added to your wallet");
    } catch {
      toast.error("Could not add the token", {
        description: "Your wallet may not support adding tokens automatically.",
      });
    }
  }

  return {
    address,
    chainId,
    eligibility,
    claimEligibility,
    data,
    nft,
    community,
    paused,
    symbol,
    decimals,
    userBalance,
    claimBalance,
    thresholdEligible,
    checking,
    addedToken,
    addToken,
    refresh,
  };
}

type ClaimDataValue = ReturnType<typeof useClaimDataValue>;

const ClaimDataContext = createContext<ClaimDataValue | null>(null);

export function ClaimDataProvider({ children }: { children: ReactNode }) {
  const value = useClaimDataValue();

  return (
    <ClaimDataContext.Provider value={value}>
      {children}
    </ClaimDataContext.Provider>
  );
}

export function useClaimData() {
  const value = useContext(ClaimDataContext);

  if (!value) {
    throw new Error("useClaimData must be used within ClaimDataProvider");
  }

  return value;
}
