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
import { claimAbi, tokenAbi } from "@/lib/abis";
import {
  CLAIM_ADDRESS,
  CLAIM_CHAIN_ID,
  IS_CONFIGURED,
  SITE_URL,
  TOKENOMICS,
  TOKEN_ADDRESS,
  TOKEN_FALLBACK,
} from "@/lib/config";

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
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "decimals",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "NFT_POOL",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "COMMUNITY_POOL",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "totalSupply",
        chainId: CLAIM_CHAIN_ID,
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
    nftPoolResult,
    communityPoolResult,
    totalSupplyResult,
  ] = tokenData ?? [];

  const symbol =
    symbolResult?.status === "success"
      ? (symbolResult.result as string)
      : TOKEN_FALLBACK.symbol;
  const decimals =
    decimalsResult?.status === "success"
      ? Number(decimalsResult.result)
      : TOKEN_FALLBACK.decimals;
  const nftPool =
    nftPoolResult?.status === "success"
      ? (nftPoolResult.result as bigint)
      : TOKENOMICS.nftPool;
  const communityPool =
    communityPoolResult?.status === "success"
      ? (communityPoolResult.result as bigint)
      : TOKENOMICS.communityPool;
  const totalSupply =
    totalSupplyResult?.status === "success"
      ? (totalSupplyResult.result as bigint)
      : TOKENOMICS.totalSupply;
  const ownerAllocation =
    totalSupply > nftPool + communityPool
      ? totalSupply - nftPool - communityPool
      : TOKENOMICS.ownerAllocation;

  const data = claimEligibility.data;
  const nft = data?.nft;
  const community = data?.community;
  const paused = data?.paused ?? false;
  const thresholdEligible = eligibility.data?.eligible ?? false;

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
    totalSupply,
    nftPool,
    communityPool,
    ownerAllocation,
    thresholdEligible,
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
