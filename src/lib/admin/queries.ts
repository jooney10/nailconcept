import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/admin/session";

/** Restrict queries to a staff member's own bookings; owners see everything. */
export function scopeWhere(user: SessionUser) {
  return user.role === "OWNER" ? {} : { technicianId: user.technicianId ?? "__none__" };
}

const bookingInclude = {
  service: { select: { name: true, durationMin: true } },
  technician: { select: { name: true } },
} as const;

export async function getUpcomingBookings(user: SessionUser, limit?: number) {
  return prisma.booking.findMany({
    where: {
      ...scopeWhere(user),
      status: "CONFIRMED",
      startAt: { gte: new Date() },
    },
    include: bookingInclude,
    orderBy: { startAt: "asc" },
    ...(limit ? { take: limit } : {}),
  });
}

export async function getPastBookings(user: SessionUser, limit = 50) {
  return prisma.booking.findMany({
    where: {
      ...scopeWhere(user),
      startAt: { lt: new Date() },
    },
    include: bookingInclude,
    orderBy: { startAt: "desc" },
    take: limit,
  });
}

export async function getDashboardStats(user: SessionUser) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);

  const scope = scopeWhere(user);
  const [todayCount, weekCount, upcomingCount] = await Promise.all([
    prisma.booking.count({
      where: { ...scope, status: "CONFIRMED", startAt: { gte: startOfToday, lt: endOfToday } },
    }),
    prisma.booking.count({
      where: { ...scope, status: "CONFIRMED", startAt: { gte: now, lt: in7 } },
    }),
    prisma.booking.count({
      where: { ...scope, status: "CONFIRMED", startAt: { gte: now } },
    }),
  ]);
  return { todayCount, weekCount, upcomingCount };
}
