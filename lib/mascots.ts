export type Mascot = {
  id: string;
  name: string;
  title: string;
  role: string;
  blurb: string;
  image: string;
  accent: "brand" | "mint" | "warn" | "danger";
  rarity: string;
};

export const MASCOTS = [
  {
    id: "sentinel",
    name: "Sentinel",
    title: "The Guardian",
    role: "Security",
    blurb:
      "Armored and unhurried. Sentinel watches the contract layer so holders never have to.",
    image: "/mascots/sentinel.png",
    accent: "brand",
    rarity: "Elyziuma",
  },
  {
    id: "executive",
    name: "Executive",
    title: "The Operator",
    role: "Governance",
    blurb:
      "Suit pressed, ledger open. Executive runs the treasury and the votes behind it.",
    image: "/mascots/executive.png",
    accent: "mint",
    rarity: "Elyziuma",
  },
  {
    id: "overclock",
    name: "Overclock",
    title: "The Runner",
    role: "Infrastructure",
    blurb:
      "Green light, no brakes. Overclock keeps the chain fast when the mint goes live.",
    image: "/mascots/overclock.png",
    accent: "mint",
    rarity: "Elyziuma",
  },
  {
    id: "analyst",
    name: "Analyst",
    title: "The Reader",
    role: "Signals",
    blurb:
      "Charts before candles. Analyst reads the market so the community stays informed.",
    image: "/mascots/analyst.jpg",
    accent: "warn",
    rarity: "Elyziuma",
  },
  {
    id: "prism",
    name: "Prism",
    title: "The Builder",
    role: "Creation",
    blurb:
      "Faceted and strange. Prism builds the art layer the rest of the collection wears.",
    image: "/mascots/prism.png",
    accent: "danger",
    rarity: "Elyziuma",
  },
] as const satisfies readonly Mascot[];

export const HERO_MASCOT_ID = "sentinel";

/**
 * The collection cover art. It is the main image on the launchpad, sized for
 * the preview panel rather than for a full-bleed hero.
 */
export const COLLECTION_COVER = {
  id: "collection",
  name: "Elyziuma",
  title: "The Collection",
  image: "/collection/elyziuma-cover.jpg",
} as const;

export function getMascot(id: string): Mascot {
  return MASCOTS.find((mascot) => mascot.id === id) ?? MASCOTS[0];
}

export const MASCOT_ACCENTS = {
  brand: "border-brand/30 bg-brand/10 text-brand",
  mint: "border-mint/30 bg-mint/10 text-mint",
  warn: "border-warn/30 bg-warn/10 text-warn",
  danger: "border-danger/30 bg-danger/10 text-danger",
} as const;

export const MASCOT_GLOWS = {
  brand: "rgba(52,183,221,0.55)",
  mint: "rgba(125,240,196,0.5)",
  warn: "rgba(245,180,91,0.45)",
  danger: "rgba(255,122,122,0.45)",
} as const;