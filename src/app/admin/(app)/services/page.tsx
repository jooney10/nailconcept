import { requireOwner } from "@/lib/admin/session";
import { getAllServices } from "@/lib/business";
import { ServicesManager } from "@/components/admin/ServicesManager";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  await requireOwner();
  const services = await getAllServices();

  return (
    <div>
      <h1 className="text-3xl">Services</h1>
      <p className="mt-1 text-[var(--grey)]">
        Your treatment menu — shown on the site and in the booking flow.
      </p>
      <ServicesManager
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          durationMin: s.durationMin,
          pricePence: s.pricePence,
          priceText: s.priceText,
          category: s.category,
          active: s.active,
          displayOrder: s.displayOrder,
        }))}
      />
    </div>
  );
}
