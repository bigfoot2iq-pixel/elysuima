"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClaimData, useCollectionData } from "./admin-data";
import { type Tone } from "./admin-ui";
import { sameAddress } from "./admin-utils";
import { ClaimSection } from "./claim-section";
import { CollectionSection } from "./collection-section";
import { OwnershipSection } from "./ownership-section";

const SECTIONS = [
  { id: "collection", index: "01", label: "NFT Collection" },
  { id: "ownership", index: "02", label: "Ownership" },
  { id: "claim", index: "03", label: "Claim & rewards" },
] as const;

const dotStyles: Record<Tone, string> = {
  mint: "bg-mint shadow-[0_0_8px_rgba(125,240,196,0.7)]",
  brand: "bg-brand shadow-[0_0_8px_rgba(52,183,221,0.7)]",
  warn: "bg-warn shadow-[0_0_8px_rgba(245,180,91,0.7)]",
  danger: "bg-danger shadow-[0_0_8px_rgba(255,122,122,0.7)]",
  muted: "bg-paper/30",
};

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function AdminConsole({ sessionAddress }: { sessionAddress: Address }) {
  const mounted = useMounted();

  if (!mounted) return <AdminConsoleSkeleton />;

  return <AdminConsoleContent sessionAddress={sessionAddress} />;
}

function AdminConsoleContent({ sessionAddress }: { sessionAddress: Address }) {
  const router = useRouter();
  const { address } = useAccount();
  const claim = useClaimData({ poll: false });
  const collection = useCollectionData({ poll: false });
  const [active, setActive] = useActiveSection();
  const [locking, setLocking] = useState(false);
  useHashScroll();

  async function lock() {
    if (locking) return;
    setLocking(true);

    try {
      await fetch("/api/admin/session", { method: "DELETE" });
      router.refresh();
    } finally {
      setLocking(false);
    }
  }

  const isClaimOwner = sameAddress(address, claim.owner);
  const isCollectionOwner = sameAddress(address, collection.owner);

  const sectionTones: Record<string, Tone> = {
    collection: isCollectionOwner ? "mint" : "muted",
    ownership: isCollectionOwner ? "danger" : "muted",
    claim: isClaimOwner ? "mint" : "muted",
  };

  return (
    <div className="section-shell pb-24 pt-4 sm:pt-6">
      <h1 className="sr-only">Elyziuma NFT collection admin</h1>
      <MobileSectionNav active={active} onSelect={setActive} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-[96px]">
            <p className="text-[9px] uppercase tracking-[0.2em] text-paper-mute">
              Sections
            </p>
            <nav className="mt-3 space-y-1" aria-label="Admin sections">
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={() => setActive(section.id)}
                  aria-current={active === section.id ? "location" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl py-2.5 pl-3 pr-2 transition",
                    active === section.id
                      ? "bg-brand/[0.07] text-paper"
                      : "text-paper-dim hover:bg-paper/[0.04] hover:text-paper",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full transition",
                      active === section.id
                        ? "bg-brand"
                        : "bg-transparent group-hover:bg-paper/20",
                    )}
                  />
                  <span
                    className={cn(
                      "font-mono text-[9px]",
                      active === section.id
                        ? "text-brand"
                        : "text-paper-mute",
                    )}
                  >
                    {section.index}
                  </span>
                  <span className="text-xs font-medium">{section.label}</span>
                  <span
                    className={cn(
                      "ml-auto size-1.5 rounded-full",
                      dotStyles[sectionTones[section.id] ?? "muted"],
                    )}
                  />
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 space-y-12">
          <CollectionSection address={address} />
          <OwnershipSection address={address} />
          <ClaimSection address={address} />

          <div className="flex flex-col gap-3 border-t border-paper/[0.07] pt-6 text-[10px] leading-5 text-paper-mute sm:flex-row sm:items-center sm:justify-between">
            <p>
              NFT collection writes are owner transactions. Network changes are
              signed messages.
            </p>
            <div className="flex items-center gap-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em]">
                Unlocked · {shortAddress(sessionAddress, 4)}
              </p>
              <button
                type="button"
                onClick={() => void lock()}
                disabled={locking}
                className="inline-flex items-center gap-1.5 rounded-full border border-paper/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-paper-mute transition hover:border-danger/40 hover:text-danger disabled:opacity-50"
              >
                {locking ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <LockKeyhole className="size-3" />
                )}
                Lock
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileSectionNav({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="sticky top-[76px] z-40 -mx-5 mt-0 border-y border-paper/[0.07] bg-ink/85 px-5 py-2 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:hidden">
      <nav
        className="flex gap-1 overflow-x-auto pb-0.5"
        aria-label="Admin sections"
      >
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={() => onSelect(section.id)}
            aria-current={active === section.id ? "location" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] transition",
              active === section.id
                ? "bg-brand/10 text-brand"
                : "text-paper-mute hover:bg-paper/[0.04] hover:text-paper",
            )}
          >
            <span>{section.index}</span>
            {section.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

function AdminConsoleSkeleton() {
  return (
    <div className="section-shell pb-24 pt-4 sm:pt-6" aria-busy="true">
      <h1 className="sr-only">Elyziuma NFT collection admin</h1>
      <div className="sticky top-[76px] z-40 -mx-5 mt-0 border-y border-paper/[0.07] bg-ink/85 px-5 py-2 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:hidden">
        <div className="flex gap-1 overflow-hidden">
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-paper/[0.04]"
            />
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-[96px]">
            <p className="text-[9px] uppercase tracking-[0.2em] text-paper-mute">
              Sections
            </p>
            <div className="mt-3 space-y-1">
              {SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center gap-3 rounded-xl py-2.5 pl-3 pr-2"
                >
                  <span className="font-mono text-[9px] text-paper-mute">
                    {section.index}
                  </span>
                  <span className="text-xs text-paper-mute">
                    {section.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
        <div className="min-w-0 space-y-6">
          <div className="h-14 animate-pulse rounded-2xl bg-paper/[0.05]" />
          <div className="h-52 animate-pulse rounded-3xl bg-paper/[0.04]" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-2xl bg-paper/[0.04]"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-3xl bg-paper/[0.04]" />
        </div>
      </div>
      <p className="sr-only">Loading the admin console…</p>
    </div>
  );
}

function useActiveSection() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const elements = SECTIONS.map((section) =>
      document.getElementById(section.id),
    ).filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              right.intersectionRatio - left.intersectionRatio,
          )[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.2, 0.5, 1] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return [active, setActive] as const;
}

function useHashScroll() {
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    const timeout = window.setTimeout(() => {
      document
        .getElementById(hash)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    return () => window.clearTimeout(timeout);
  }, []);
}
