import { custom } from "viem";
import {
  getChainExplorerUrl,
  getChainRpcUrl,
  getDefaultChainId,
} from "@/lib/chains";

/**
 * The network the app is pointed at right now.
 *
 * The chain, the RPC, and the explorer are switched together from the
 * launchpad admin console. The chain id is chosen at runtime, but the viem
 * chain objects for every supported network are registered with wagmi at build
 * time so the wallet can switch between them.
 */
export type RuntimeNetwork = {
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
};

const defaultChainId = getDefaultChainId();

let runtime: RuntimeNetwork = {
  chainId: defaultChainId,
  rpcUrl: getChainRpcUrl(defaultChainId),
  explorerUrl: getChainExplorerUrl(defaultChainId),
};

let requestId = 0;

export function getRuntimeNetwork(): RuntimeNetwork {
  return runtime;
}

/**
 * The RPC override for a chain, but only while that chain is the active one.
 * Other chains fall back to their built-in endpoint.
 */
export function getRuntimeRpcUrl(chainId?: number): string {
  if (chainId !== undefined && chainId !== runtime.chainId) return "";
  return runtime.rpcUrl;
}

export function getRuntimeExplorerUrl(): string {
  return runtime.explorerUrl;
}

/**
 * Points the app at a chain. Passing only an RPC keeps the current chain;
 * passing a chain id resets the RPC and explorer to that chain's defaults
 * unless they are given explicitly.
 */
export function setRuntimeNetwork(next: {
  chainId?: number;
  rpcUrl?: string;
  explorerUrl?: string;
}) {
  const chainId = next.chainId ?? runtime.chainId;

  const rpcUrl = next.rpcUrl?.trim()
    ? next.rpcUrl.trim().replace(/\/+$/, "")
    : getChainRpcUrl(chainId);

  const explorerUrl = next.explorerUrl?.trim()
    ? next.explorerUrl.trim().replace(/\/+$/, "")
    : getChainExplorerUrl(chainId);

  runtime = { chainId, rpcUrl, explorerUrl };
}

type JsonRpcResponse = {
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
};

/**
 * A transport whose endpoint follows the runtime network. It is created once
 * per registered chain, so switching networks at runtime only needs the
 * active chain's RPC to change.
 */
export function createRuntimeTransport(chainId: number) {
  const fallbackUrl = getChainRpcUrl(chainId);

  return custom(
    {
      async request({ method, params }) {
        requestId += 1;
        const url = getRuntimeRpcUrl(chainId) || fallbackUrl;

        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: requestId,
            method,
            params: params ?? [],
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          throw new Error(`The Elysium RPC returned HTTP ${response.status}.`);
        }

        const payload = (await response.json()) as JsonRpcResponse;
        if (payload.error) {
          throw new Error(
            payload.error.message ?? "The Elysium RPC returned an error.",
          );
        }

        return payload.result;
      },
    },
    {
      retryCount: 1,
      name: "Elysium runtime RPC",
    },
  );
}
