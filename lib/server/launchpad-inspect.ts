import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  toFunctionSelector,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { launchpadReadAbi, seaDropAbi, elyziumaNftReadAbi } from "@/lib/launchpad/abis";
import { normalizeRpcUrl } from "@/lib/launchpad/config";
import { getElysiumChain } from "@/lib/chains";
import {
  EIP1967_IMPLEMENTATION_SLOT,
  ERC1155_INTERFACE_ID,
  ERC721_INTERFACE_ID,
  SEADROP_ADDRESS,
  SEADROP_FEE_RECIPIENT,
  type ContractInspection,
  type DetectedMethod,
  type ElyziumaDropInfo,
  type MintMethod,
  type RpcTest,
  type SeaDropInfo,
} from "@/lib/launchpad/types";

type CollectionMethodId = Exclude<MintMethod, "auto" | "seadrop">;

const COLLECTION_METHODS: {
  id: CollectionMethodId;
  signature: string;
}[] = [
  { id: "mint-address-amount", signature: "mint(address,uint256)" },
  { id: "mint-amount", signature: "mint(uint256)" },
  { id: "public-mint-amount", signature: "publicMint(uint256)" },
  { id: "mint-public-amount", signature: "mintPublic(uint256)" },
  { id: "claim-address-amount", signature: "claim(address,uint256)" },
  { id: "mint-to-address", signature: "mintTo(address)" },
  { id: "safe-mint-address", signature: "safeMint(address)" },
];

const ZERO_WORD =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function clientFor(rpcUrl: string) {
  return createPublicClient({
    transport: http(rpcUrl, {
      timeout: 12_000,
      retryCount: 1,
    }),
  });
}

async function readOrUndefined<T>(read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read();
  } catch {
    return undefined;
  }
}

export type InspectInput = {
  rpcUrl: string;
  /** Chain the RPC has to report for the inspection to succeed. */
  chainId: number;
  collectionAddress?: string;
  seaDropAddress?: string;
  feeRecipient?: string;
};

function failedInspection(input: InspectInput, message: string): ContractInspection {
  return {
    ok: false,
    rpcUrl: input.rpcUrl,
    chainId: input.chainId,
    collectionAddress: input.collectionAddress ?? "",
    methods: [],
    message,
  };
}

export async function testRpc(
  rpcUrl: string,
  expectedChainId: number,
): Promise<RpcTest> {
  const url = normalizeRpcUrl(rpcUrl);
  if (!url) {
    return {
      ok: false,
      rpcUrl,
      message: "Enter a valid http(s) RPC URL.",
    };
  }

  const expected = getElysiumChain(expectedChainId);
  const startedAt = Date.now();
  try {
    const client = clientFor(url);
    const [chainId, blockNumber] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
    ]);
    const latencyMs = Date.now() - startedAt;
    const correctChain = chainId === expected.id;

    return {
      ok: correctChain,
      rpcUrl: url,
      chainId,
      blockNumber: blockNumber.toString(),
      latencyMs,
      message: correctChain
        ? undefined
        : `This RPC reports chain ${chainId}; ${expected.name} is ${expected.id}.`,
    };
  } catch (error) {
    return {
      ok: false,
      rpcUrl: url,
      latencyMs: Date.now() - startedAt,
      message:
        error instanceof Error
          ? error.message.split("\n")[0]
          : "The RPC did not respond.",
    };
  }
}

async function resolveImplementation(
  client: PublicClient,
  address: Address,
  code: Hex,
) {
  const slot = await readOrUndefined(() =>
    client.getStorageAt({
      address,
      slot: EIP1967_IMPLEMENTATION_SLOT,
    }),
  );

  if (slot && slot !== ZERO_WORD) {
    const candidate = `0x${slot.slice(-40)}`;
    if (isAddress(candidate) && candidate.toLowerCase() !== ZERO_ADDRESS) {
      return getAddress(candidate);
    }
  }

  const minimalProxyPrefix = "0x363d3d373d3d3d363d73";
  if (code.toLowerCase().startsWith(minimalProxyPrefix)) {
    const candidate = code.slice(22, 62);
    if (isAddress(candidate) && candidate.toLowerCase() !== ZERO_ADDRESS) {
      return getAddress(candidate);
    }
  }

  return undefined;
}

type ParsedPublicDrop = {
  mintPrice: string;
  startTime: number;
  endTime: number;
  maxPerWallet: number;
  feeBps: number;
  restrictFeeRecipients: boolean;
};

function bigintValue(value: unknown) {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" || typeof value === "string") {
      return BigInt(value);
    }
  } catch {
    // Fall through to zero.
  }
  return 0n;
}

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
}

function parsePublicDrop(value: unknown): ParsedPublicDrop | undefined {
  if (!value) return undefined;

  let mintPrice: unknown;
  let startTime: unknown;
  let endTime: unknown;
  let maxPerWallet: unknown;
  let feeBps: unknown;
  let restrictFeeRecipients: unknown;

  if (Array.isArray(value)) {
    [mintPrice, startTime, endTime, maxPerWallet, feeBps, restrictFeeRecipients] =
      value;
  } else if (typeof value === "object") {
    const drop = value as Record<string, unknown>;
    mintPrice = drop.mintPrice;
    startTime = drop.startTime;
    endTime = drop.endTime;
    maxPerWallet =
      drop.maxTotalMintableByWallet ?? drop.maxPerWallet ?? drop.maxMintableByWallet;
    feeBps = drop.feeBps;
    restrictFeeRecipients = drop.restrictFeeRecipients;
  } else {
    return undefined;
  }

  return {
    mintPrice: bigintValue(mintPrice).toString(),
    startTime: numberValue(startTime),
    endTime: numberValue(endTime),
    maxPerWallet: numberValue(maxPerWallet),
    feeBps: numberValue(feeBps),
    restrictFeeRecipients: Boolean(restrictFeeRecipients),
  };
}

async function detectSeaDrop(
  client: PublicClient,
  collection: Address,
  input: InspectInput,
): Promise<SeaDropInfo | undefined> {
  const allowedSeaDrops = await readOrUndefined(() =>
    client.readContract({
      address: collection,
      abi: launchpadReadAbi,
      functionName: "getAllowedSeaDrop",
    }),
  );

  const allowedList = allowedSeaDrops?.map((address) => getAddress(address));
  const configured =
    input.seaDropAddress && isAddress(input.seaDropAddress)
      ? getAddress(input.seaDropAddress)
      : undefined;

  let candidates: Address[];
  if (allowedList && allowedList.length > 0) {
    candidates = configured && allowedList.includes(configured)
      ? [configured, ...allowedList.filter((item) => item !== configured)]
      : [...allowedList];
  } else {
    candidates = [];
    if (configured) candidates.push(configured);
    candidates.push(SEADROP_ADDRESS);
    candidates = [...new Set(candidates)];
  }

  const configuredFeeRecipient =
    input.feeRecipient && isAddress(input.feeRecipient)
      ? getAddress(input.feeRecipient)
      : undefined;

  for (const candidate of candidates) {
    const code = await readOrUndefined(() =>
      client.getCode({ address: candidate }),
    );
    if (!code || code === "0x") continue;

    const rawDrop = await readOrUndefined(() =>
      client.readContract({
        address: candidate,
        abi: seaDropAbi,
        functionName: "getPublicDrop",
        args: [collection],
      }),
    );
    const drop = parsePublicDrop(rawDrop);
    if (!drop) continue;

    const allowedByContract = allowedList?.includes(candidate) ?? false;
    const emptyDrop =
      drop.mintPrice === "0" &&
      drop.startTime === 0 &&
      drop.endTime === 0 &&
      drop.maxPerWallet === 0;
    if (emptyDrop && !allowedByContract) continue;

    const feeRecipients = drop.restrictFeeRecipients
      ? ((
          await readOrUndefined(() =>
            client.readContract({
              address: candidate,
              abi: seaDropAbi,
              functionName: "getAllowedFeeRecipients",
              args: [collection],
            }),
          )
        )?.map((address) => getAddress(address)) ?? [])
      : [];

    let feeRecipient = "";
    if (drop.restrictFeeRecipients) {
      feeRecipient =
        configuredFeeRecipient && feeRecipients.includes(configuredFeeRecipient)
          ? configuredFeeRecipient
          : (feeRecipients[0] ?? "");
    } else {
      feeRecipient =
        configuredFeeRecipient ?? getAddress(SEADROP_FEE_RECIPIENT);
    }

    const creatorPayout = await readOrUndefined(() =>
      client.readContract({
        address: candidate,
        abi: seaDropAbi,
        functionName: "getCreatorPayoutAddress",
        args: [collection],
      }),
    );

    return {
      address: candidate,
      mintPrice: drop.mintPrice,
      startTime: drop.startTime,
      endTime: drop.endTime,
      maxPerWallet: drop.maxPerWallet,
      feeBps: drop.feeBps,
      feeRecipient,
      feeRecipients,
      restrictFeeRecipients: drop.restrictFeeRecipients,
      creatorPayout:
        creatorPayout && creatorPayout !== ZERO_ADDRESS
          ? getAddress(creatorPayout)
          : undefined,
    };
  }

  return undefined;
}

/**
 * Reads the on-chain drop configuration of the Elyziuma collection. The
 * contract keeps the public phase on-chain, so the launchpad follows the
 * contract instead of the saved settings. A collection that does not expose
 * these getters simply fails the probe and is left alone.
 */
async function detectElyziumaDrop(
  client: PublicClient,
  collection: Address,
): Promise<ElyziumaDropInfo | undefined> {
  const read = <T>(functionName: string) =>
    readOrUndefined(() =>
      client.readContract({
        address: collection,
        abi: elyziumaNftReadAbi,
        functionName,
      } as never),
    ) as Promise<T | undefined>;

  const [publicPrice, publicMintOpen, maxPerWallet, legacyMaxPerWallet] =
    await Promise.all([
      read<bigint>("publicPrice"),
      read<boolean>("publicMintOpen"),
      read<bigint>("maxPerWallet"),
      read<bigint>("MAX_PER_WALLET"),
    ]);

  if (publicPrice === undefined || publicMintOpen === undefined) return undefined;

  return {
    publicPrice: publicPrice.toString(),
    publicMintOpen,
    maxPerWallet: Number(maxPerWallet ?? legacyMaxPerWallet ?? 0n),
  };
}

export async function inspectContract(
  input: InspectInput,
): Promise<ContractInspection> {
  const rpcUrl = normalizeRpcUrl(input.rpcUrl);
  if (!rpcUrl) {
    return failedInspection(input, "Enter a valid http(s) RPC URL.");
  }

  const collectionInput = input.collectionAddress?.trim() ?? "";
  if (collectionInput && !isAddress(collectionInput)) {
    return failedInspection(
      { ...input, rpcUrl },
      "Enter a valid collection contract address.",
    );
  }

  const client = clientFor(rpcUrl);
  const startedAt = Date.now();

  let chainId: number;
  let blockNumber: bigint;
  try {
    [chainId, blockNumber] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
    ]);
  } catch (error) {
    return {
      ...failedInspection(
        { ...input, rpcUrl, collectionAddress: collectionInput },
        error instanceof Error
          ? error.message.split("\n")[0]
          : "The RPC did not respond.",
      ),
      latencyMs: Date.now() - startedAt,
    };
  }

  const latencyMs = Date.now() - startedAt;
  const base = {
    rpcUrl,
    collectionAddress: collectionInput,
    chainId,
    blockNumber: blockNumber.toString(),
    latencyMs,
  };

  if (chainId !== getElysiumChain(input.chainId).id) {
    const expected = getElysiumChain(input.chainId);
    return {
      ...base,
      ok: false,
      methods: [],
      message: `This RPC reports chain ${chainId}; ${expected.name} is ${expected.id}.`,
    };
  }

  if (!collectionInput) {
    return {
      ...base,
      ok: true,
      methods: [],
      message: "RPC reachable. Add a collection address to inspect a contract.",
    };
  }

  const collection = getAddress(collectionInput);
  const code = await readOrUndefined(() =>
    client.getCode({ address: collection }),
  );

  if (!code || code === "0x") {
    return {
      ...base,
      ok: false,
      methods: [],
      message: `No contract code was found at this address on ${getElysiumChain(input.chainId).name}.`,
    };
  }

  const implementation = await resolveImplementation(client, collection, code);
  const implementationCode = implementation
    ? await readOrUndefined(() => client.getCode({ address: implementation }))
    : undefined;

  const [name, symbol, owner, totalSupply, maxSupply, isErc721, isErc1155] =
    await Promise.all([
      readOrUndefined(() =>
        client.readContract({
          address: collection,
          abi: launchpadReadAbi,
          functionName: "name",
        }),
      ),
      readOrUndefined(() =>
        client.readContract({
          address: collection,
          abi: launchpadReadAbi,
          functionName: "symbol",
        }),
      ),
      readOrUndefined(() =>
        client.readContract({
          address: collection,
          abi: launchpadReadAbi,
          functionName: "owner",
        }),
      ),
      readOrUndefined(() =>
        client.readContract({
          address: collection,
          abi: launchpadReadAbi,
          functionName: "totalSupply",
        }),
      ),
      readOrUndefined(() =>
        client.readContract({
          address: collection,
          abi: launchpadReadAbi,
          functionName: "maxSupply",
        }),
      ),
      readOrUndefined(() =>
        client.readContract({
          address: collection,
          abi: launchpadReadAbi,
          functionName: "supportsInterface",
          args: [ERC721_INTERFACE_ID],
        }),
      ),
      readOrUndefined(() =>
        client.readContract({
          address: collection,
          abi: launchpadReadAbi,
          functionName: "supportsInterface",
          args: [ERC1155_INTERFACE_ID],
        }),
      ),
    ]);

  const bytecode = (
    implementationCode && implementationCode !== "0x"
      ? implementationCode
      : code
  ).toLowerCase();

  const methods: DetectedMethod[] = COLLECTION_METHODS.map((method) => {
    const selector = toFunctionSelector(method.signature).slice(2);
    return {
      id: method.id,
      label: method.signature,
      signature: method.signature,
      available: bytecode.includes(selector),
      source: "collection",
    };
  });

  const seaDrop = await detectSeaDrop(client, collection, input);
  methods.push({
    id: "seadrop",
    label: "mintPublic(address,address,address,uint256)",
    signature: "mintPublic(address,address,address,uint256)",
    available: Boolean(seaDrop),
    source: "seadrop",
  });

  const elyziumaDrop = await detectElyziumaDrop(client, collection);

  const detectedCollectionMethod = methods.find(
    (method) => method.available && method.id !== "seadrop",
  )?.id;

  const detectedMethod: Exclude<MintMethod, "auto"> | undefined = seaDrop
    ? "seadrop"
    : (detectedCollectionMethod as Exclude<MintMethod, "auto"> | undefined);

  const standard = isErc721
    ? "ERC721"
    : isErc1155
      ? "ERC1155"
      : "UNKNOWN";

  return {
    ...base,
    ok: true,
    collectionAddress: collection,
    name,
    symbol,
    owner: owner ? getAddress(owner) : undefined,
    implementation,
    standard,
    isErc721: Boolean(isErc721),
    isErc1155: Boolean(isErc1155),
    totalSupply: totalSupply?.toString(),
    maxSupply: maxSupply?.toString(),
    detectedMethod,
    methods,
    seaDrop,
    elyziumaDrop,
    message: detectedMethod
      ? undefined
      : "No common public mint function was detected. Choose a method manually.",
  };
}
