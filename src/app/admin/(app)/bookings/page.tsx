import Link from "next/link";
import { requireSession } from "@/lib/admin/session";
import { getBusiness } from "@/lib/business";
import { getUpcomingBookings, getPastBookings } from "@/lib/admin/queries";
import { formatShort } from "@/lib/datetime";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/enums";
import { BookingActions } from "@/components/admin/BookingActions";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  CONFIRMED: { bg: "#e5f4ea", fg: "#1c7a43" },
  COMPLETED: { bg: "var(--blush)", fg: "var(--brand-dark)" },
  CANCELLED: { bg: "#f6e4e2", fg: "#a6534e" },
  NO_SHOW: { bg: "#efe9e7", fg: "#6f5d58" },
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const isPast = tab === "past";
  const user = await requireSession();
  const business = await getBusiness();

  const bookings = isPast
    ? await getPastBookings(user)
    : await getUpcomingBookings(user);

  return (
    <div>
      <h1 className="text-3xl">Bookings</h1>

      <div className="mt-4 inline-flex rounded-xl border border-[var(--border)] bg-white p-1">
        <TabLink href="/admin/bookings" active={!isPast} label="Upcoming" />
        <TabLink href="/admin/bookings?tab=past" active={isPast} label="Past" />
      </div>

      <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-white">
        {bookings.length === 0 ? (
          <p className="p-8 text-center text-[var(--grey)]">
            No {isPast ? "past" : "upcoming"} bookings.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {bookings.map((b) => {
              const style = STATUS_STYLE[b.status] ?? STATUS_STYLE.CONFIRMED;
              const whenLabel = formatShort(b.startAt, business.timezone);
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{b.customerName}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                        style={{ background: style.bg, color: style.fg }}
                      >
                        {BOOKING_STATUS_LABELS[b.status as BookingStatus] ?? b.status}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm text-[var(--grey)]">
                      {b.service.name}
                      {user.role === "OWNER" ? ` · ${b.technician.name}` : ""} ·{" "}
                      <a href={`tel:${b.customerPhone}`} className="hover:underline">
                        {b.customerPhone}
                      </a>
                    </div>
                    {b.notes && (
                      <div className="mt-1 text-sm italic text-[var(--ink-soft)]">
                        “{b.notes}”
                      </div>
                    )}
                  </div>

                  <div className="text-sm">
                    <div className="font-bold">{whenLabel}</div>
                    <div className="text-[var(--grey)]">{b.reference}</div>
                  </div>

                  <BookingActions
                    id={b.id}
                    phone={b.customerPhone}
                    customerName={b.customerName}
                    reference={b.reference}
                    status={b.status}
                    businessName={business.name}
                    whenLabel={whenLabel}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-4 py-1.5 text-sm font-bold transition-colors"
      style={active ? { background: "var(--brand)", color: "#fff" } : { color: "var(--ink-soft)" }}
    >
      {label}
    </Link>
  );
}
