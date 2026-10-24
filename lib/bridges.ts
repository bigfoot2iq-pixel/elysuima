import { LINKS } from "./config";

/** A card on /bridge: a bridge or a place to get testnet gas. */
export type Bridge = {
  key: string;
  /** Corner label, e.g. "Bridge 01" or "Faucet". */
  label: string;
  name: string;
  href: string;
  description: string;
  /** Host shown under the button so the reader knows where they land. */
  host: string;
  /** Icon key resolved by the UI layer. */
  icon: "waves" | "box" | "droplet";
};

/** The bridges listed on /bridge, in the order they are presented. */
export const BRIDGES: Bridge[] = [
  {
    key: "elyspump",
    label: "Bridge 01",
    name: "ElysPump",
    href: LINKS.elyspump,
    description: "Bridge to Elysium through ElysPump.",
    host: "elyspump.com",
    icon: "waves",
  },
  {
    key: "boxa",
    label: "Bridge 02",
    name: "Boxa",
    href: LINKS.boxa,
    description: "You can also use Boxa to bridge your assets to Elysium.",
    host: "boxa.pro",
    icon: "box",
  },
];

/** Testnet gas, listed with the bridges because it is the other way to get going. */
export const TESTNET_FAUCET: Bridge = {
  key: "testnet-faucet",
  label: "Faucet",
  name: "Testnet faucet",
  href: LINKS.testnetFaucet,
  description:
    "Grab testnet HYPE to cover gas on Elysium Testnet before you bridge.",
  host: "elysium.kinetiq.xyz",
  icon: "droplet",
};
