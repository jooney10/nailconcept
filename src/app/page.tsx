import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { ServicesSection } from "@/components/site/ServicesSection";
import { GallerySection } from "@/components/site/GallerySection";
import { AboutSection } from "@/components/site/AboutSection";
import { ContactSection } from "@/components/site/ContactSection";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  getBusiness,
  getServicesByCategory,
  getActiveTechnicians,
} from "@/lib/business";

// Always render fresh so admin edits (services, About, branding) show immediately.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [business, groups, technicians] = await Promise.all([
    getBusiness(),
    getServicesByCategory(),
    getActiveTechnicians(),
  ]);

  return (
    <>
      <SiteHeader business={business} />
      <main>
        <Hero business={business} />
        <ServicesSection groups={groups} />
        <GallerySection />
        <AboutSection business={business} technicians={technicians} />
        <ContactSection business={business} />
      </main>
      <SiteFooter business={business} />
    </>
  );
}
