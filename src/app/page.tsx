import { Navbar } from "@/components/layout/navbar";
import { Hero } from "@/components/layout/hero";
import { DemoVideo } from "@/components/layout/demo-video";
import { Testimonials } from "@/components/layout/testimonials";
import { Features } from "@/components/layout/features";
import { HowItWorks } from "@/components/layout/how-it-works";
import { Pricing } from "@/components/layout/pricing";
import { CTA } from "@/components/layout/cta";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <DemoVideo />
        <Testimonials />
        <Features />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
