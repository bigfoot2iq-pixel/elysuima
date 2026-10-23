"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { LINKS } from "@/lib/config";
import { cn } from "@/lib/utils";
import { TokenMark } from "./token-mark";
import { WalletButton } from "./wallet-button";

const NAV = [
  { label: "Claim", href: "/#claim" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Activity", href: "/#activity" },
  { label: "FAQ", href: "/#faq" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

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
              daily claim
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm text-paper-dim transition hover:bg-paper/[0.05] hover:text-paper"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={LINKS.x}
            target="_blank"
            rel="noreferrer"
            className="hidden h-11 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-paper-dim transition hover:text-paper sm:inline-flex"
          >
            X
            <ArrowUpRight className="size-3" />
          </a>
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-paper/10 text-paper transition hover:bg-paper/[0.05] md:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-paper/[0.06] bg-ink/95 transition-[max-height,opacity] duration-300 md:hidden",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="space-y-1 px-5 py-5">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 text-sm text-paper-dim transition hover:bg-paper/[0.05] hover:text-paper"
            >
              {item.label}
            </a>
          ))}
          <a
            href={LINKS.x}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-xl px-3 py-3 text-sm text-paper-dim transition hover:bg-paper/[0.05] hover:text-paper"
          >
            Follow on X <ArrowUpRight className="size-3.5" />
          </a>
          <div className="pt-3 sm:hidden">
            <WalletButton compact />
          </div>
        </div>
      </div>
    </header>
  );
}
