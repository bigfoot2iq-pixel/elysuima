"use client";

import { useQuery } from "@tanstack/react-query";
import { useBalance, useReadContracts } from "wagmi";
import { getAddress, isAddress, type Address } from "viem";
import { claimAbi, tokenAbi } from "@/lib/abis";
import { elyziumaNftAbi } from "@/lib/collection/abis";
import { COLLECTION_CHAIN_ID } from "@/lib/collection/config";
import {
  CLAIM_ADDRESS,
  CLAIM_CHAIN_ID,
  IS_CONFIGURED,
  TOKEN_ADDRESS,
  TOKEN_FALLBACK,
} from "@/lib/config";
import { useLaunchpadConfig } from "@/hooks/use-launchpad-config";
import { getElysiumChain } from "@/lib/chains";
import type {
  LaunchpadAdminStatus,
  LaunchpadConfig,
} from "@/lib/launchpad/types";
import { deriveBaseUri, PROBE_TOKEN_ID } from "./admin-utils";

export type Health = {
  ok: boolean;
  configured?: boolean;
  paused?: boolean;
  nftAddress?: string;
  communityClaimFee?: string;
  feeRecipient?: string;
  accruedFees?: string;
  nftClaimedTotal?: string;
  communityClaimedTotal?: string;
  nftPoolRemaining?: string;
  communityPoolRemaining?: string;
  tokenBalance?: string;
  funded?: boolean;
  message?: string;
};

export type AdminResponse = {
  config: LaunchpadConfig;
  admin: LaunchpadAdminStatus;
};

export function launchpadAdminKey(address?: string) {
  return ["launchpad-admin", address?.toLowerCase()] as const;
}

export type PollOptions = {
  /** Set false for read-only summary views that share a polling section. */
  poll?: boolean;
};

export function useHealth(options: PollOptions = {}) {
  return useQuery<Health>({
    queryKey: ["admin-health"],
    enabled: IS_CONFIGURED,
    refetchInterval: options.poll === false ? false : 30_000,
    queryFn: async () => {
      const response = await fetch("/api/health", { cache: "no-store" });
      return (await response.json()) as Health;
    },
  });
}

export function useClaimData(options: PollOptions = {}) {
  const query = useReadContracts({
    contracts: [
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "owner",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "paused",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "nft",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "communityClaimFee",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "feeRecipient",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "accruedFees",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "nftClaimedTotal",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "communityClaimedTotal",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "nftClaimCount",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "communityClaimCount",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "nftPoolRemaining",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: CLAIM_ADDRESS,
        abi: claimAbi,
        functionName: "communityPoolRemaining",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [CLAIM_ADDRESS],
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "decimals",
        chainId: CLAIM_CHAIN_ID,
      },
      {
        address: TOKEN_ADDRESS,
        abi: tokenAbi,
        functionName: "symbol",
        chainId: CLAIM_CHAIN_ID,
      },
    ],
    query: {
      enabled: IS_CONFIGURED,
      refetchInterval: options.poll === false ? false : 20_000,
    },
    allowFailure: true,
  });

  const [
    ownerResult,
    pausedResult,
    nftResult,
    communityClaimFeeResult,
    feeRecipientResult,
    accruedFeesResult,
    nftClaimedTotalResult,
    communityClaimedTotalResult,
    nftClaimCountResult,
    communityClaimCountResult,
    nftPoolRemainingResult,
    communityPoolRemainingResult,
    tokenBalanceResult,
    decimalsResult,
    symbolResult,
  ] = query.data ?? [];

  return {
    configured: IS_CONFIGURED,
    isLoading: query.isLoading,
    refetch: query.refetch,
    owner:
      ownerResult?.status === "success"
        ? (ownerResult.result as Address)
        : undefined,
    paused:
      pausedResult?.status === "success"
        ? (pausedResult.result as boolean)
        : false,
    nftAddress:
      nftResult?.status === "success"
        ? (nftResult.result as Address)
        : undefined,
    communityClaimFee:
      communityClaimFeeResult?.status === "success"
        ? (communityClaimFeeResult.result as bigint)
        : undefined,
    feeRecipient:
      feeRecipientResult?.status === "success"
        ? (feeRecipientResult.result as Address)
        : undefined,
    accruedFees:
      accruedFeesResult?.status === "success"
        ? (accruedFeesResult.result as bigint)
        : undefined,
    nftClaimedTotal:
      nftClaimedTotalResult?.status === "success"
        ? (nftClaimedTotalResult.result as bigint)
        : undefined,
    communityClaimedTotal:
      communityClaimedTotalResult?.status === "success"
        ? (communityClaimedTotalResult.result as bigint)
        : undefined,
    nftClaimCount:
      nftClaimCountResult?.status === "success"
        ? (nftClaimCountResult.result as bigint)
        : undefined,
    communityClaimCount:
      communityClaimCountResult?.status === "success"
        ? (communityClaimCountResult.result as bigint)
        : undefined,
    nftPoolRemaining:
      nftPoolRemainingResult?.status === "success"
        ? (nftPoolRemainingResult.result as bigint)
        : undefined,
    communityPoolRemaining:
      communityPoolRemainingResult?.status === "success"
        ? (communityPoolRemainingResult.result as bigint)
        : undefined,
    tokenBalance:
      tokenBalanceResult?.status === "success"
        ? (tokenBalanceResult.result as bigint)
        : undefined,
    decimals:
      decimalsResult?.status === "success"
        ? Number(decimalsResult.result)
        : TOKEN_FALLBACK.decimals,
    symbol:
      symbolResult?.status === "success"
        ? (symbolResult.result as string)
        : TOKEN_FALLBACK.symbol,
  };
}

export function useCollectionData(options: PollOptions = {}) {
  const launchpadQuery = useLaunchpadConfig();

  /**
   * The collection console follows the launchpad. The launchpad network and
   * collection address are the single source of truth, so changing them above
   * automatically repoints every read and write here.
   */
  const activeChainId = launchpadQuery.data?.chainId ?? COLLECTION_CHAIN_ID;
  const activeChain = getElysiumChain(activeChainId);
  const collectionAddress =
    launchpadQuery.data?.collectionAddress &&
    isAddress(launchpadQuery.data.collectionAddress)
      ? getAddress(launchpadQuery.data.collectionAddress)
      : undefined;
  const isConfigured = Boolean(collectionAddress);

  const query = useReadContracts({
    contracts: [
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "owner",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "name",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "symbol",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "totalMinted",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "totalSupply",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "maxSupply",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "maxPerWallet",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "MAX_PER_WALLET",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "publicPrice",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "publicMintOpen",
        chainId: activeChainId,
      },
      {
        address: collectionAddress,
        abi: elyziumaNftAbi,
        functionName: "tokenURI",
        args: [PROBE_TOKEN_ID],
        chainId: activeChainId,
      },
    ],
    query: {
      enabled: isConfigured,
      refetchInterval: options.poll === false ? false : 20_000,
    },
    allowFailure: true,
  });

  const [
    ownerResult,
    nameResult,
    symbolResult,
    totalMintedResult,
    totalSupplyResult,
    maxSupplyResult,
    maxPerWalletResult,
    legacyMaxPerWalletResult,
    publicPriceResult,
    publicMintOpenResult,
    tokenUriResult,
  ] = query.data ?? [];

  const { data: treasury } = useBalance({
    address: collectionAddress,
    chainId: activeChainId,
    query: {
      enabled: isConfigured,
      refetchInterval: options.poll === false ? false : 20_000,
    },
  });

  return {
    launchpadQuery,
    activeChainId,
    activeChain,
    collectionAddress,
    isConfigured,
    isLoading: launchpadQuery.isPending || (isConfigured && query.isLoading),
    refetch: query.refetch,
    owner:
      ownerResult?.status === "success"
        ? (ownerResult.result as Address)
        : undefined,
    name:
      nameResult?.status === "success"
        ? (nameResult.result as string)
        : undefined,
    symbol:
      symbolResult?.status === "success"
        ? (symbolResult.result as string)
        : undefined,
    totalMinted:
      totalMintedResult?.status === "success"
        ? (totalMintedResult.result as bigint)
        : undefined,
    totalSupply:
      totalSupplyResult?.status === "success"
        ? (totalSupplyResult.result as bigint)
        : undefined,
    maxSupply:
      maxSupplyResult?.status === "success"
        ? (maxSupplyResult.result as bigint)
        : undefined,
    maxPerWallet:
      maxPerWalletResult?.status === "success"
        ? (maxPerWalletResult.result as bigint)
        : legacyMaxPerWalletResult?.status === "success"
          ? (legacyMaxPerWalletResult.result as bigint)
          : undefined,
    publicPrice:
      publicPriceResult?.status === "success"
        ? (publicPriceResult.result as bigint)
        : undefined,
    publicMintOpen:
      publicMintOpenResult?.status === "success"
        ? (publicMintOpenResult.result as boolean)
        : false,
    baseUri:
      tokenUriResult?.status === "success"
        ? deriveBaseUri(tokenUriResult.result as string)
        : undefined,
    treasury,
  };
}

export function useLaunchpadAdminData(address?: Address) {
  const publicConfig = useLaunchpadConfig();

  const adminQuery = useQuery<AdminResponse>({
    queryKey: launchpadAdminKey(address),
    enabled: Boolean(address),
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/launchpad?address=${encodeURIComponent(address ?? "")}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message ??
            `The admin settings could not be loaded (HTTP ${response.status}).`,
        );
      }

      return (await response.json()) as AdminResponse;
    },
    staleTime: 60_000,
    retry: 1,
  });

  return {
    publicConfig,
    adminQuery,
    config: adminQuery.data?.config ?? publicConfig.data,
    admin: adminQuery.data?.admin,
  };
}
