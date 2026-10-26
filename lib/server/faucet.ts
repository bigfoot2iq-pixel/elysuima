import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { getChainRpcUrl, getElysiumViemChain } from "@/lib/chains";
import { FAUCET_CHAIN_ID } from "@/lib/config";

const DEFAULT_AMOUNT = "0.01";
const DEFAULT_COOLDOWN_HOURS = 24;
const MAX_COOLDOWN_HOURS = 24 * 7;

/** Keep enough in the drip wallet to pay for the transfer itself. */
export const FAUCET_GAS_RESERVE = parseEther("0.002");

const chain = getElysiumViemChain(FAUCET_CHAIN_ID);

let publicClient: ReturnType<typeof createPublicClient> | undefined;

/** The RPC used to send the drip. The public endpoint can be read-only. */
function getFaucetRpcUrl() {
  return process.env.FAUCET_RPC_URL?.trim() || getChainRpcUrl(FAUCET_CHAIN_ID);
}

function getPublicClient() {
  publicClient ??= createPublicClient({
    chain,
    transport: http(getFaucetRpcUrl(), {
      timeout: 8_000,
      retryCount: 1,
    }),
  });
  return publicClient;
}

/**
 * The wallet that funds the drip. It is intentionally separate from the claim
 * owner: this key needs a small HYPE balance, but it never authorizes claims or
 * touches the collection.
 */
export function getFaucetAccount(): PrivateKeyAccount | null {
  const privateKey = process.env.FAUCET_DRIP_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) return null;

  try {
    return privateKeyToAccount(privateKey as Hex);
  } catch {
    return null;
  }
}

/** The amount sent per claim, in wei. */
export function getFaucetAmount(): bigint {
  const configured = process.env.FAUCET_DRIP_AMOUNT?.trim() || DEFAULT_AMOUNT;

  let amount: bigint;
  try {
    amount = parseEther(configured);
  } catch {
    amount = parseEther(DEFAULT_AMOUNT);
  }

  if (amount <= 0n) return parseEther(DEFAULT_AMOUNT);

  // A typo should not drain the wallet in one claim.
  const ceiling = parseEther("1");
  return amount > ceiling ? ceiling : amount;
}

/** The per-wallet cooldown, in milliseconds. */
export function getFaucetCooldownMs(): number {
  const configured = Number(process.env.FAUCET_COOLDOWN_HOURS);
  const hours =
    Number.isFinite(configured) && configured > 0
      ? Math.min(configured, MAX_COOLDOWN_HOURS)
      : DEFAULT_COOLDOWN_HOURS;

  return Math.round(hours * 60 * 60 * 1_000);
}

export async function getFaucetBalance(address: Address): Promise<bigint> {
  return getPublicClient().getBalance({ address });
}

export type FaucetSummary = {
  configured: boolean;
  faucetAddress: Address | null;
  faucetBalance: string | null;
  readError: boolean;
};

export async function getFaucetSummary(): Promise<FaucetSummary> {
  const account = getFaucetAccount();
  if (!account) {
    return {
      configured: false,
      faucetAddress: null,
      faucetBalance: null,
      readError: false,
    };
  }

  try {
    const balance = await getFaucetBalance(account.address);
    return {
      configured: true,
      faucetAddress: account.address,
      faucetBalance: balance.toString(),
      readError: false,
    };
  } catch (error) {
    console.warn("Could not read the faucet wallet balance", error);
    return {
      configured: true,
      faucetAddress: account.address,
      faucetBalance: null,
      readError: true,
    };
  }
}

let sendChain: Promise<unknown> = Promise.resolve();

/**
 * Sends the testnet HYPE drip. Sends are serialized so two claims cannot grab
 * the same nonce from the drip wallet.
 */
export async function sendFaucetDrip(
  to: Address,
  amount: bigint,
): Promise<Hash> {
  const account = getFaucetAccount();
  if (!account) throw new Error("The faucet drip wallet is not configured.");

  const task = sendChain.then(async () => {
    const wallet = createWalletClient({
      account,
      chain,
      transport: http(getFaucetRpcUrl(), {
        timeout: 20_000,
        retryCount: 0,
      }),
    });

    return wallet.sendTransaction({ to, value: amount });
  });

  sendChain = task.then(
    () => undefined,
    () => undefined,
  );

  return task as Promise<Hash>;
}
