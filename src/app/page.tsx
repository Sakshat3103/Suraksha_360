import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { AiFeatures } from "@/components/landing/ai-features";
import { Stats } from "@/components/landing/stats";
import { Testimonials } from "@/components/landing/testimonials";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ProductShowcase />
        <AiFeatures />
        <Stats />
        <Testimonials />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
