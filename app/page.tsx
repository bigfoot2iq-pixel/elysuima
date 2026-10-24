import { ClosingCta } from "@/components/closing-cta";
import { Faq } from "@/components/faq";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { LaunchpadTeaser } from "@/components/launchpad/launchpad-teaser";
import { Origin } from "@/components/origin";
import { Roadmap } from "@/components/roadmap";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatsStrip } from "@/components/stats-strip";
import { Vision } from "@/components/vision";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Origin />
        <Roadmap />
        <Vision />
        <LaunchpadTeaser />
        <StatsStrip />
        <HowItWorks />
        <ClosingCta />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
