"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAdminSession } from "@/hooks/use-admin-session";
import { cn } from "@/lib/utils";
import { TokenMark } from "./token-mark";
import { WalletButton } from "./wallet-button";
import { XAccountLink } from "./x-account-link";

const PUBLIC_NAV = [
  { label: "Launchpad", href: "/launchpad" },
  { label: "Faucet", href: "/faucet" },
  { label: "Roadmap", href: "/#roadmap" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "FAQ", href: "/#faq" },
];

const CLAIM_NAV = { label: "Claim", href: "/claim" };

/** The claim page is private, so its link only appears with an allowed session. */
function navigationFor(showClaim: boolean) {
  if (!showClaim) return PUBLIC_NAV;

  return [PUBLIC_NAV[0], CLAIM_NAV, ...PUBLIC_NAV.slice(1)];
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const session = useAdminSession();
  const nav = navigationFor(session.data?.authenticated === true);

  return (
    <header className="sticky top-0 z-50 border-b border-paper/[0.07] bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] w-full max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label="Elyziuma home"
        >
          <TokenMark size={34} glow />
          <span className="flex flex-col leading-none">
            <span className="text-[13px] font-bold tracking-[0.22em] text-paper">
              ELYZIUMA
            </span>
            <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-brand/80">
              claim · mint
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map((item) => {
            const active =
              item.href === pathname ||
              (item.href.startsWith("/") &&
                !item.href.includes("#") &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition",
                  active
                    ? "bg-paper/[0.07] font-medium text-paper"
                    : "text-paper-dim hover:bg-paper/[0.05] hover:text-paper",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <XAccountLink className="hidden sm:inline-flex" />
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-paper/10 text-paper transition hover:bg-paper/[0.05] lg:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-paper/[0.06] bg-ink/95 transition-[max-height,opacity] duration-300 lg:hidden",
          open ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="space-y-1 px-5 py-5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 text-sm text-paper-dim transition hover:bg-paper/[0.05] hover:text-paper"
            >
              {item.label}
            </Link>
          ))}
          <XAccountLink
            showLabel
            className="mt-2 flex w-full justify-center pl-3 pr-3"
          />
          <div className="pt-3 sm:hidden">
            <WalletButton compact />
          </div>
        </div>
      </div>
    </header>
  );
}
