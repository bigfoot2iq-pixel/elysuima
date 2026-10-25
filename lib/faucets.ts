import { LINKS } from "./config";

/** A card on /faucet: a place to request testnet HYPE for gas. */
export type Faucet = {
  key: string;
  /** Corner label, e.g. "Faucet 01". */
  label: string;
  name: string;
  href: string;
  description: string;
  /** Host shown under the button so the reader knows where they land. */
  host: string;
  /** Icon key resolved by the UI layer. */
  icon: "droplet" | "zap";
};

/** The faucets listed on /faucet, in the order they are presented. */
export const FAUCETS: Faucet[] = [
  {
    key: "elysium",
    label: "Faucet 01",
    name: "Elysium Testnet Faucet",
    href: LINKS.testnetFaucet,
    description:
      "The official Kinetiq faucet. Connect your wallet and receive testnet HYPE for gas on Elysium Testnet.",
    host: "elysium.kinetiq.xyz",
    icon: "droplet",
  },
  {
    key: "quicknode",
    label: "Faucet 02",
    name: "QuickNode Faucet",
    href: LINKS.quicknodeFaucet,
    description:
      "An alternative route to testnet HYPE. Paste your wallet address and complete the verification step.",
    host: "faucet.quicknode.com",
    icon: "zap",
  },
];
