import { requireSession } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { getBusiness } from "@/lib/business";
import { getDashboardStats } from "@/lib/admin/queries";
import { DashboardCalendar } from "@/components/admin/DashboardCalendar";

export const dynamic = "force-dynamic";

const toHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function DashboardPage() {
  const user = await requireSession();
  const business = await getBusiness();
  const stats = await getDashboardStats(user);

  // Scope shading + technician options to the signed-in user.
  const isOwner = user.role === "OWNER";
  const hoursScope = isOwner ? {} : { technicianId: user.technicianId ?? "__none__" };
  const techWhere = isOwner
    ? { active: true }
    : { active: true, id: user.technicianId ?? "__none__" };
  const [workingHours, services, technicians] = await Promise.all([
    prisma.workingHours.findMany({ where: hoursScope }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, durationMin: true },
    }),
    prisma.technician.findMany({
      where: techWhere,
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const businessHours = workingHours.map((w) => ({
    daysOfWeek: [w.weekday],
    startTime: toHHMM(w.startMinute),
    endTime: toHHMM(w.endMinute),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Calendar</h1>
          <p className="mt-1 text-[var(--grey)]">
            {user.role === "OWNER" ? "Everything across the studio." : "Your appointments."}{" "}
            Click a slot to add a booking; drag one to reschedule.
          </p>
        </div>
        <div className="flex gap-3">
          <MiniStat label="Today" value={stats.todayCount} />
          <MiniStat label="Next 7 days" value={stats.weekCount} />
          <MiniStat label="Upcoming" value={stats.upcomingCount} />
        </div>
      </div>

      <div className="mt-5">
        <DashboardCalendar
          businessHours={businessHours}
          businessName={business.name}
          services={services}
          technicians={technicians}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--grey)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded" style={{ background: "#c9716b" }} />
          Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded" style={{ background: "#f4b942" }} />
          Awaiting reschedule confirmation
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ background: "rgba(138,118,114,0.3)" }}
          />
          Time off
        </span>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-center">
      <div className="font-[family-name:var(--font-display)] text-2xl" style={{ color: "var(--brand)" }}>
        {value}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--grey)]">
        {label}
      </div>
    </div>
  );
}
