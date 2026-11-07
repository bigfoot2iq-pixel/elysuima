export type RaffleAccent = "atlassians" | "elytra";

export type RaffleArtwork = {
  name: string;
  title?: string;
  tokenId?: string;
  image: string;
  collection: string;
  collectionUrl?: string;
  accent?: RaffleAccent;
  /** Keep small pixel art crisp instead of letting the browser smooth it. */
  pixelated?: boolean;
};

export type ActiveRaffle = RaffleArtwork & {
  id: string;
  status: "live";
  /** Unique wallets that entered the draw. */
  joined: number;
  /** Entry cap for the current draw. */
  capacity: number;
  /** Entry price in ELYZ. */
  entryFee: number;
  winners: number;
};

export type EndedRaffle = RaffleArtwork & {
  id: string;
  status: "ended";
  joined: number;
  entryFee: number;
  winner: string;
  closedOn: string;
};

export type Raffle = ActiveRaffle | EndedRaffle;

/**
 * Demo data. Live draws render first; guest collections sit alongside the
 * Elyziuma draws in the same grid, so another live draw can be added without
 * changing the layout.
 */
export const ACTIVE_RAFFLES: readonly ActiveRaffle[] = [
  {
    id: "sentinel-0412",
    status: "live",
    name: "Sentinel",
    title: "The Guardian",
    tokenId: "0412",
    image: "/mascots/launchpad/sentinel.jpg",
    collection: "Elyziuma",
    joined: 184,
    capacity: 250,
    entryFee: 10,
    winners: 1,
  },
];

export const ENDED_RAFFLES: readonly EndedRaffle[] = [
  {
    id: "prism-0771",
    status: "ended",
    name: "Prism",
    title: "The Builder",
    tokenId: "0771",
    image: "/mascots/launchpad/prism.jpg",
    collection: "Elyziuma",
    joined: 312,
    entryFee: 10,
    winner: "0x3a1f4c7e82b9d15a6f30c2ed5ba84c1d9f04e7b2",
    closedOn: "Oct 24",
  },
  {
    id: "atlassians-001",
    status: "ended",
    name: "Atlassians",
    image: "/raffles/atlassians.webp",
    collection: "Atlassians",
    collectionUrl: "https://opensea.io/collection/atlassians/overview",
    accent: "atlassians",
    joined: 147,
    entryFee: 10,
    winner: "0x8f3a2c94d17b5e60a4f8c2d91b7e03a6c5d24f18",
    closedOn: "Oct 21",
  },
  {
    id: "elytra-001",
    status: "ended",
    name: "Elytra",
    image: "/raffles/elytra.jpg",
    collection: "Elytra",
    collectionUrl: "https://x.com/ElytraNFT",
    accent: "elytra",
    pixelated: true,
    joined: 203,
    entryFee: 10,
    winner: "0x2d7b9e41c68a05f3d2e7b94c1a8f60d3e5c2b7a9",
    closedOn: "Oct 12",
  },
];
