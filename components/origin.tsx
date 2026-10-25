import Image from "next/image";
import { ArrowUpRight, Quote } from "lucide-react";
import { getDefaultChainId, getElysiumChain } from "@/lib/chains";

const OMNIA_X = "https://x.com/0xOmnia";
const OMNIA_POST_X = "https://x.com/0xOmnia/status/2110811924879564876";
const chain = getElysiumChain(getDefaultChainId());

export function Origin() {
  return (
    <section
      id="origin"
      className="section-shell scroll-mt-28 pb-16 sm:pb-24"
      aria-labelledby="origin-title"
    >
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
        <div>
          <p className="eyebrow">Origin</p>
          <h2
            id="origin-title"
            className="mt-4 max-w-xl font-display text-3xl font-extrabold tracking-[-0.04em] text-paper sm:text-4xl"
          >
            One piece of artwork on X,
            <span className="block text-paper-dim">
              and a reason to build together.
            </span>
          </h2>
          <p className="mt-5 max-w-lg text-[13px] leading-7 text-paper-dim">
            The idea behind Elyziuma was inspired by Omnia and the artwork they
            shared on X. That moment sparked the idea of building something
            together around the Elysium ecosystem.
          </p>
          <p className="mt-4 max-w-lg text-[13px] leading-7 text-paper-dim">
            Elyziuma is a 2,222-piece NFT collection built on Elysium — the
            first step of that plan.
          </p>

          <dl className="mt-8 grid max-w-lg grid-cols-2 gap-4 border-t border-paper/[0.07] pt-5 sm:grid-cols-3">
            {[
              { label: "Pieces", value: "2,222" },
              { label: "Chain", value: chain.name },
              { label: "Chain ID", value: String(chain.id) },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[9px] uppercase tracking-[0.16em] text-paper-mute">
                  {item.label}
                </dt>
                <dd className="mt-2 font-mono text-[11px] leading-5 text-paper sm:text-xs">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The post that started it, rendered as a keepsake card. */}
        <figure className="ink-panel sticker group/omnia relative overflow-hidden rounded-[26px] p-6 transition-colors hover:border-brand/25 sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-16 size-52 rounded-full bg-brand/10 blur-[70px]"
          />

          {/*
           * Stretched link: the whole post opens the tweet, while the byline
           * above it stays a separate link to Omnia's profile.
           */}
          <a
            href={OMNIA_POST_X}
            target="_blank"
            rel="noreferrer"
            aria-label="Open Omnia's post on X in a new tab"
            className="absolute inset-0 z-10 rounded-[26px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand/70"
          />

          <a
            href={OMNIA_X}
            target="_blank"
            rel="noreferrer"
            className="group/byline relative z-20 flex w-fit items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <Image
              src="/brand/omnia-avatar.jpg"
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-full border border-brand/25 object-cover transition group-hover/byline:border-brand/50"
            />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold text-paper transition group-hover/omnia:text-brand">
                Omnia
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper-mute">
                The spark
              </span>
            </span>
          </a>

          <blockquote className="relative mt-6 font-display text-xl font-semibold leading-snug tracking-[-0.03em] text-paper sm:text-[26px]">
            <Quote
              aria-hidden="true"
              className="mb-2 size-5 text-beak/70"
              strokeWidth={2.5}
            />
            The artwork shared on X sparked the idea of building something
            together around the Elysium ecosystem.
          </blockquote>

          <figcaption className="relative mt-7 flex items-center justify-between gap-4 border-t border-paper/[0.07] pt-4 font-mono text-[9px] uppercase tracking-[0.18em]">
            <span className="text-paper-mute">Source · artwork on X</span>
            <span className="inline-flex items-center gap-1 text-brand/80 transition group-hover/omnia:text-brand">
              View post <ArrowUpRight className="size-3" />
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
