import { requireOwner } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { TechniciansManager } from "@/components/admin/TechniciansManager";

export const dynamic = "force-dynamic";

export default async function TechniciansPage() {
  const owner = await requireOwner();

  const [technicians, services] = await Promise.all([
    prisma.technician.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        user: { select: { email: true, role: true } },
        services: { select: { id: true } },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.service.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="text-3xl">Technicians</h1>
      <p className="mt-1 text-[var(--grey)]">
        Add or remove technicians and choose which services each one offers.
      </p>
      <TechniciansManager
        services={services}
        technicians={technicians.map((t) => ({
          id: t.id,
          name: t.name,
          bio: t.bio,
          active: t.active,
          role: t.user?.role ?? "STAFF",
          email: t.user?.email ?? "—",
          serviceIds: t.services.map((s) => s.id),
          isSelf: t.userId === owner.id,
          bookingCount: t._count.bookings,
        }))}
      />
    </div>
  );
}
