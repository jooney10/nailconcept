import Link from "next/link";
import { requireSession } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { AvailabilityEditor } from "@/components/admin/AvailabilityEditor";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ tech?: string }>;
}) {
  const { tech } = await searchParams;
  const user = await requireSession();
  const isOwner = user.role === "OWNER";

  const technicians = isOwner
    ? await prisma.technician.findMany({ orderBy: { displayOrder: "asc" } })
    : await prisma.technician.findMany({ where: { id: user.technicianId ?? "__none__" } });

  if (technicians.length === 0) {
    return (
      <div>
        <h1 className="text-3xl">Availability</h1>
        <p className="mt-4 text-[var(--grey)]">No technician profile linked to your account.</p>
      </div>
    );
  }

  const selectedId =
    (isOwner && tech && technicians.some((t) => t.id === tech) ? tech : null) ??
    technicians[0].id;

  const [workingHours, timeOff] = await Promise.all([
    prisma.workingHours.findMany({ where: { technicianId: selectedId } }),
    prisma.timeOff.findMany({
      where: { technicianId: selectedId, endAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-3xl">Availability</h1>
      <p className="mt-1 text-[var(--grey)]">Set when you&apos;re working and block out time off.</p>

      {isOwner && technicians.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {technicians.map((t) => (
            <Link
              key={t.id}
              href={`/admin/availability?tech=${t.id}`}
              className="rounded-lg border px-3.5 py-1.5 text-sm font-bold transition-colors"
              style={
                t.id === selectedId
                  ? { background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }
                  : { background: "#fff", borderColor: "var(--border)", color: "var(--ink-soft)" }
              }
            >
              {t.name}
              {!t.active && " (inactive)"}
            </Link>
          ))}
        </div>
      )}

      <AvailabilityEditor
        key={selectedId}
        technicianId={selectedId}
        initialBlocks={workingHours.map((w) => ({
          weekday: w.weekday,
          startMinute: w.startMinute,
          endMinute: w.endMinute,
        }))}
        initialTimeOff={timeOff.map((t) => ({
          id: t.id,
          startAt: t.startAt.toISOString(),
          endAt: t.endAt.toISOString(),
          reason: t.reason,
        }))}
      />
    </div>
  );
}
