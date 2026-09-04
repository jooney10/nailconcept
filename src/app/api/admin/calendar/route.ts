import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/admin/session";
import { scopeWhere } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

// Distinct, on-brand colours assigned per technician.
const PALETTE = ["#c9716b", "#8a5a72", "#6b8e9b", "#c9a25a", "#7a9b6b", "#a86a8f"];

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const startParam = req.nextUrl.searchParams.get("start");
  const endParam = req.nextUrl.searchParams.get("end");
  const rangeStart = startParam ? new Date(startParam) : new Date();
  const rangeEnd = endParam
    ? new Date(endParam)
    : new Date(Date.now() + 14 * 86_400_000);

  const scope = scopeWhere(user);

  // Colour map for all technicians (stable order).
  const technicians = await prisma.technician.findMany({ orderBy: { displayOrder: "asc" } });
  const colorFor = new Map<string, string>();
  technicians.forEach((t, i) => colorFor.set(t.id, PALETTE[i % PALETTE.length]));

  const [bookings, timeOff] = await Promise.all([
    prisma.booking.findMany({
      where: {
        ...scope,
        status: { not: "CANCELLED" },
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      include: {
        service: { select: { name: true, durationMin: true } },
        technician: { select: { name: true } },
      },
    }),
    prisma.timeOff.findMany({
      where: {
        ...scope,
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
    }),
  ]);

  const bookingEvents = bookings.map((b) => {
    const awaiting = b.rescheduleState === "AWAITING";
    const color = colorFor.get(b.technicianId) ?? PALETTE[0];
    return {
      id: b.id,
      title: `${b.customerName} · ${b.service.name}`,
      start: b.startAt.toISOString(),
      end: b.endAt.toISOString(),
      editable: b.status === "CONFIRMED",
      backgroundColor: awaiting ? "#f4b942" : color,
      borderColor: awaiting ? "#d99514" : color,
      classNames: awaiting ? ["evt-awaiting"] : [],
      extendedProps: {
        status: b.status,
        rescheduleState: b.rescheduleState,
        technicianName: b.technician.name,
        serviceName: b.service.name,
        reference: b.reference,
        phone: b.customerPhone,
        customerName: b.customerName,
        notes: b.notes,
      },
    };
  });

  const timeOffEvents = timeOff.map((t) => ({
    id: `off-${t.id}`,
    title: t.reason || "Time off",
    start: t.startAt.toISOString(),
    end: t.endAt.toISOString(),
    display: "background",
    backgroundColor: "rgba(138,118,114,0.18)",
  }));

  return NextResponse.json({ events: [...bookingEvents, ...timeOffEvents] });
}
