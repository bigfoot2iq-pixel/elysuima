import { ClaimsFeed } from "@/components/claims-feed";
import { Faq } from "@/components/faq";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatsStrip } from "@/components/stats-strip";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <StatsStrip />
        <HowItWorks />
        <ClaimsFeed />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
