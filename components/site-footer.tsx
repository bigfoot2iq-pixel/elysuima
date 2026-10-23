import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LINKS } from "@/lib/config";
import { TokenMark } from "./token-mark";

const PRODUCT = [
  { label: "Claim", href: "/#claim" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Activity", href: "/#activity" },
  { label: "FAQ", href: "/#faq" },
];

const ELYSIUM = [
  { label: "Testnet faucet", href: LINKS.faucet },
  { label: "Bridge", href: LINKS.bridge },
  { label: "Explorer", href: LINKS.explorer },
  { label: "Docs", href: LINKS.docs },
];

export function SiteFooter() {
  return (
    <footer className="relative border-t border-paper/[0.07]">
      <div className="section-shell pb-10 pt-12 sm:pb-14 sm:pt-16">
        <div className="grid gap-10 md:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <TokenMark size={38} glow />
              <span className="flex flex-col leading-none">
                <span className="text-[13px] font-bold tracking-[0.22em] text-paper">
                  ELYZIUMA
                </span>
                <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-brand/80">
                  daily claim
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[11px] leading-6 text-paper-mute">
              A daily ELYZ drop for the Elysium community. Built on Elysium
              Testnet. No sign-ups, no custody, no promises.
            </p>
            <a
              href={LINKS.x}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-dim transition hover:text-brand"
            >
              Follow on X <ArrowUpRight className="size-3" />
            </a>
          </div>

          <FooterColumn title="Product" links={PRODUCT} />
          <FooterColumn title="Elysium" links={ELYSIUM} />

          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-paper-mute">
              Owner
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-paper-dim transition hover:text-brand"
            >
              Admin console <ArrowUpRight className="size-3" />
            </Link>
            <p className="mt-6 text-[9px] uppercase tracking-[0.18em] text-paper-mute">
              Network
            </p>
            <p className="mt-2 font-mono text-[11px] text-paper-dim">
              Elysium Testnet
            </p>
            <p className="mt-1 font-mono text-[10px] text-paper-mute">
              Chain ID 99801
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-paper/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[9px] uppercase tracking-[0.14em] text-paper-mute">
            © 2026 Elyziuma. Testnet only.
          </p>
          <p className="max-w-xl text-[9px] leading-5 text-paper-mute/80 sm:text-right">
            ELYZ has no monetary value. This page is an experimental interface
            for Elysium Testnet and is not financial advice.
          </p>
        </div>
      </div>

      <div
        className="pointer-events-none select-none overflow-hidden"
        aria-hidden="true"
      >
        <p className="translate-y-[18%] text-center font-mono text-[clamp(4rem,15vw,13rem)] font-bold leading-none tracking-[-0.08em] text-paper/[0.025]">
          ELYZIUMA
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.18em] text-paper-mute">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noreferrer" : undefined}
              className="text-[11px] text-paper-dim transition hover:text-brand"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
