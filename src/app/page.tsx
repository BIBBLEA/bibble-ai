import { Navbar } from "@/components/layout/navbar";
import { Hero } from "@/components/layout/hero";
import { DemoVideo } from "@/components/layout/demo-video";
import { Testimonials } from "@/components/layout/testimonials";
import { Features } from "@/components/layout/features";
import { HowItWorks } from "@/components/layout/how-it-works";
import { Pricing } from "@/components/layout/pricing";
import { CTA } from "@/components/layout/cta";
import { Footer } from "@/components/layout/footer";
import { FadeInSection } from "@/components/ui/fade-in-section";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FadeInSection>
          <DemoVideo />
        </FadeInSection>
        <FadeInSection>
          <Testimonials />
        </FadeInSection>
        <FadeInSection>
          <Features />
        </FadeInSection>
        <FadeInSection>
          <HowItWorks />
        </FadeInSection>
        <FadeInSection>
          <Pricing />
        </FadeInSection>
        <FadeInSection>
          <CTA />
        </FadeInSection>
      </main>
      <Footer />
    </>
  );
}
