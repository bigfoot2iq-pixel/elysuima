import { ArrowUpRight } from "lucide-react";
import { LINKS } from "@/lib/config";

const PILLARS = [
  {
    title: "Built to stay",
    body: "Elyziuma is not about being the first collection on Elysium and then disappearing.",
  },
  {
    title: "Strengthen the ecosystem",
    body: "We want to become one of the projects that helps build, grow, and strengthen the Elysium ecosystem.",
  },
  {
    title: "More than a profile picture",
    body: "We want to prove that NFTs can be more than just a profile picture.",
  },
  {
    title: "A reason to trust NFTs again",
    body: "Most importantly, we want to build something that gives people a reason to trust NFTs again.",
  },
];

export function Vision() {
  return (
    <section
      id="vision"
      className="section-shell scroll-mt-28 pb-16 sm:pb-24"
      aria-labelledby="vision-title"
    >
      <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">Our Vision</p>
          <h2
            id="vision-title"
            className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em] text-paper sm:text-4xl"
          >
            Not the first collection on Elysium.
            <span className="block text-paper-dim">
              One of the projects that builds it.
            </span>
          </h2>
          <p className="mt-5 max-w-md text-[13px] leading-7 text-paper-dim">
            We&apos;re not asking you to trust us because of promises. We want to
            earn that trust by building.
          </p>
          <a
            href={LINKS.x}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-dim transition hover:text-brand"
          >
            Follow the build <ArrowUpRight className="size-3" />
          </a>
        </div>

        <div className="border-t border-paper/[0.07]">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="group border-b border-paper/[0.07] py-6 transition sm:py-7"
            >
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="mt-2 size-2 shrink-0 rounded-full bg-beak/80 shadow-[0_0_12px_rgba(232,80,60,0.55)] transition group-hover:bg-beak"
                />
                <div>
                  <h3 className="font-display text-lg font-extrabold tracking-[-0.03em] text-paper">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-[12px] leading-6 text-paper-dim">
                    {pillar.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The promise, in the project's own words. */}
      <div className="glass card-sheen relative mt-14 overflow-hidden rounded-[28px] px-6 py-10 sm:px-10 sm:py-12">
        <div
          aria-hidden="true"
          className="absolute -left-20 -top-24 size-64 rounded-full bg-brand/10 blur-[90px]"
        />
        <div className="relative">
          <p className="font-display text-[clamp(1.6rem,4vw,2.8rem)] font-extrabold leading-[1.05] tracking-[-0.045em] text-paper">
            Your success is{" "}
            <span className="text-gradient relative inline-block pb-[0.06em]">
              our success.
            </span>
          </p>
          <p className="mt-4 max-w-2xl text-[13px] leading-7 text-paper-dim">
            Every holder, every supporter, and every person who believes in
            Elyziuma is part of the journey.
          </p>
        </div>
      </div>
    </section>
  );
}
