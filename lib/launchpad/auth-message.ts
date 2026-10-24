import { getAddress, isAddress } from "viem";
import type { LaunchpadAdminAction } from "./types";

export function buildAdminMessage(input: {
  action: LaunchpadAdminAction;
  address: string;
  timestamp: number;
  payloadHash: string;
}) {
  const address = isAddress(input.address)
    ? getAddress(input.address)
    : input.address;

  return [
    "Elyziuma launchpad admin",
    `Action: ${input.action}`,
    `Address: ${address}`,
    `Timestamp: ${input.timestamp}`,
    `Payload hash: ${input.payloadHash}`,
    "",
    "Signing this message is free and does not send a transaction.",
  ].join("\n");
}
