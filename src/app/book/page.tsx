import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBusiness, getActiveServices } from "@/lib/business";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; tech?: string }>;
}) {
  const params = await searchParams;
  const [business, services, technicians] = await Promise.all([
    getBusiness(),
    getActiveServices(),
    prisma.technician.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
      include: { services: { select: { id: true } } },
    }),
  ]);

  const wizardServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    pricePence: s.pricePence,
    priceText: s.priceText,
    category: s.category,
  }));

  const wizardTechs = technicians.map((t) => ({
    id: t.id,
    name: t.name,
    bio: t.bio,
    serviceIds: t.services.map((s) => s.id),
  }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-white/70 backdrop-blur">
        <div className="wrap flex h-[64px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 place-items-center rounded-full text-white font-[family-name:var(--font-fraunces)]"
              style={{ background: "var(--brand)" }}
              aria-hidden
            >
              {business.name.charAt(0)}
            </span>
            <span className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
              {business.name}
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--ink-soft)] transition-colors hover:text-[var(--brand-dark)]"
          >
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="wrap max-w-3xl py-8 md:py-12">
        <BookingWizard
          services={wizardServices}
          technicians={wizardTechs}
          preselectServiceId={params.service}
          preselectTechId={params.tech}
          whatsappNumber={business.whatsappNumber}
          businessName={business.name}
        />
      </main>
    </div>
  );
}
