import { LINKS } from "./config";

export type Bridge = {
  key: string;
  name: string;
  href: string;
  description: string;
  /** Host shown under the button so the reader knows where they land. */
  host: string;
  /** Icon key resolved by the UI layer. */
  icon: "waves" | "box";
};

/** The bridges listed on /bridge, in the order they are presented. */
export const BRIDGES: Bridge[] = [
  {
    key: "elyspump",
    name: "ElysPump",
    href: LINKS.elyspump,
    description: "Bridge to Elysium through ElysPump.",
    host: "elyspump.com",
    icon: "waves",
  },
  {
    key: "boxa",
    name: "Boxa",
    href: LINKS.boxa,
    description: "You can also use Boxa to bridge your assets to Elysium.",
    host: "boxa.pro",
    icon: "box",
  },
];
