import Link from "next/link";
import { requireSession } from "@/lib/admin/session";
import { getBusiness } from "@/lib/business";
import { getDashboardStats, getUpcomingBookings } from "@/lib/admin/queries";
import { formatShort } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireSession();
  const business = await getBusiness();
  const [stats, upcoming] = await Promise.all([
    getDashboardStats(user),
    getUpcomingBookings(user, 6),
  ]);

  const stubbedNote = business.whatsappNumber ? "" : "";
  void stubbedNote;

  return (
    <div>
      <h1 className="text-3xl">Dashboard</h1>
      <p className="mt-1 text-[var(--grey)]">
        {user.role === "OWNER" ? "Everything across the studio." : "Your appointments."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Today" value={stats.todayCount} suffix="appointments" />
        <Stat label="Next 7 days" value={stats.weekCount} suffix="booked" />
        <Stat label="Upcoming total" value={stats.upcomingCount} suffix="confirmed" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-xl">Next appointments</h2>
        <Link
          href="/admin/bookings"
          className="text-sm font-bold text-[var(--brand-dark)] hover:text-[var(--brand)]"
        >
          View all →
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-white">
        {upcoming.length === 0 ? (
          <p className="p-6 text-center text-[var(--grey)]">No upcoming appointments.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {upcoming.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="font-semibold">{b.customerName}</div>
                  <div className="text-sm text-[var(--grey)]">
                    {b.service.name}
                    {user.role === "OWNER" ? ` · ${b.technician.name}` : ""}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-bold">{formatShort(b.startAt, business.timezone)}</div>
                  <div className="text-[var(--grey)]">{b.reference}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!business.whatsappNumber && (
        <p className="mt-6 rounded-xl bg-[var(--blush)] p-4 text-sm text-[var(--brand-dark)]">
          Tip: add your WhatsApp number in Settings so confirmation and reminder
          messages can reach customers.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5">
      <div className="text-sm font-semibold uppercase tracking-wider text-[var(--grey)]">
        {label}
      </div>
      <div className="mt-1 font-[family-name:var(--font-fraunces)] text-4xl" style={{ color: "var(--brand)" }}>
        {value}
      </div>
      <div className="text-sm text-[var(--grey)]">{suffix}</div>
    </div>
  );
}
