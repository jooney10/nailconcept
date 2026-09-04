import { prisma } from "@/lib/prisma";

// Server-side data loaders for public content. These run on the server (RSC) and
// are the single source of truth the customer pages read from.

const DEFAULT_BUSINESS = {
  id: "business",
  name: "Abigail Nails",
  tagline: "Home-based nail studio in Stokenchurch",
  aboutHeading: "Meet Abigail",
  aboutBody: "",
  whatsappNumber: "",
  email: "",
  addressLine: "Stokenchurch, Buckinghamshire",
  instagram: "abigaillnails",
  colorPrimary: "#c9716b",
  colorAccent: "#c9a25a",
  timezone: "Europe/London",
  slotIntervalMin: 15,
  bufferBeforeMin: 15,
  bufferAfterMin: 15,
  minNoticeHours: 12,
  maxAdvanceDays: 56,
  cancellationWindowHrs: 24,
  updatedAt: new Date(),
};

export type BusinessRecord = typeof DEFAULT_BUSINESS;

/**
 * The singleton business config, falling back to defaults if not yet seeded or
 * if the database is unreachable (e.g. during a build with no DB connection, or
 * a transient outage — the root layout renders from this on every page).
 */
export async function getBusiness(): Promise<BusinessRecord> {
  try {
    const b = await prisma.business.findUnique({ where: { id: "business" } });
    return (b as BusinessRecord) ?? DEFAULT_BUSINESS;
  } catch {
    return DEFAULT_BUSINESS;
  }
}

/** Active services in display order, grouped nothing — raw list. */
export async function getActiveServices() {
  return prisma.service.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });
}

/** Every service (admin). */
export async function getAllServices() {
  return prisma.service.findMany({ orderBy: { displayOrder: "asc" } });
}

/** Services grouped by category, preserving display order within each group. */
export async function getServicesByCategory() {
  const services = await getActiveServices();
  const groups = new Map<string, typeof services>();
  for (const s of services) {
    const list = groups.get(s.category) ?? [];
    list.push(s);
    groups.set(s.category, list);
  }
  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    items,
  }));
}

/** Active technicians (public), in display order. */
export async function getActiveTechnicians() {
  return prisma.technician.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });
}
