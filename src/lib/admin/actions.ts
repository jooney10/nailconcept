"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser, type SessionUser } from "@/lib/admin/session";
import { sendBookingMessage } from "@/lib/messaging";
import { getBusiness } from "@/lib/business";
import { generateReference } from "@/lib/reference";
import { normalizeUkPhone } from "@/lib/booking-service";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

async function ensureSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authorised");
  return user;
}

async function ensureOwner(): Promise<SessionUser> {
  const user = await ensureSession();
  if (user.role !== "OWNER") throw new Error("Owner access required");
  return user;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "tech";
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

/** Cancel a booking and send the customer a cancellation message (stubbed). */
export async function cancelBooking(id: string): Promise<ActionResult> {
  const user = await ensureSession();
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, message: "Booking not found." };
  if (user.role !== "OWNER" && booking.technicianId !== user.technicianId) {
    return { ok: false, message: "You can only manage your own bookings." };
  }

  await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
  try {
    await sendBookingMessage(id, "CANCELLATION");
  } catch (err) {
    console.error("Cancellation message failed:", err);
  }
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  return { ok: true, message: "Booking cancelled." };
}

/** Mark a booking completed and send the review request (stubbed). */
export async function completeBooking(id: string): Promise<ActionResult> {
  const user = await ensureSession();
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, message: "Booking not found." };
  if (user.role !== "OWNER" && booking.technicianId !== user.technicianId) {
    return { ok: false, message: "You can only manage your own bookings." };
  }

  await prisma.booking.update({ where: { id }, data: { status: "COMPLETED" } });
  // Only send a review request if we haven't already.
  const existing = await prisma.messageLog.findFirst({
    where: { bookingId: id, type: "REVIEW_REQUEST" },
  });
  if (!existing) {
    try {
      await sendBookingMessage(id, "REVIEW_REQUEST");
    } catch (err) {
      console.error("Review message failed:", err);
    }
  }
  revalidatePath("/admin/bookings");
  return { ok: true, message: "Marked complete — review request sent." };
}

export async function markNoShow(id: string): Promise<ActionResult> {
  const user = await ensureSession();
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return { ok: false, message: "Booking not found." };
  if (user.role !== "OWNER" && booking.technicianId !== user.technicianId) {
    return { ok: false, message: "You can only manage your own bookings." };
  }
  await prisma.booking.update({ where: { id }, data: { status: "NO_SHOW" } });
  revalidatePath("/admin/bookings");
  return { ok: true, message: "Marked as no-show." };
}

// ---------------------------------------------------------------------------
// Reschedule (drag on the calendar)
// ---------------------------------------------------------------------------

async function loadOwnedBooking(id: string, user: SessionUser) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true },
  });
  if (!booking) return null;
  if (user.role !== "OWNER" && booking.technicianId !== user.technicianId) return null;
  return booking;
}

/**
 * Move a booking to a new start time (from a calendar drag). When `notify` is
 * true the booking enters the AWAITING state and a reschedule request is sent to
 * the customer; when false it's a silent move (fixing your own schedule).
 */
export async function moveBooking(
  id: string,
  newStartIso: string,
  notify: boolean,
): Promise<ActionResult> {
  const user = await ensureSession();
  const booking = await loadOwnedBooking(id, user);
  if (!booking) return { ok: false, message: "Booking not found." };

  const newStart = new Date(newStartIso);
  if (Number.isNaN(newStart.getTime())) {
    return { ok: false, message: "Invalid time." };
  }
  const newEnd = new Date(newStart.getTime() + booking.service.durationMin * 60_000);

  await prisma.booking.update({
    where: { id },
    data: {
      previousStartAt: booking.startAt,
      previousEndAt: booking.endAt,
      startAt: newStart,
      endAt: newEnd,
      rescheduleState: notify ? "AWAITING" : "NONE",
      rescheduleRequestedAt: notify ? new Date() : null,
    },
  });

  if (notify) {
    try {
      await sendBookingMessage(id, "RESCHEDULE_REQUEST");
    } catch (err) {
      console.error("Reschedule request failed:", err);
    }
  }
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  return {
    ok: true,
    message: notify ? "Moved — reschedule request sent to customer." : "Booking moved.",
  };
}

/** Confirm a pending reschedule (customer said yes, or manual override). */
export async function confirmReschedule(id: string): Promise<ActionResult> {
  const user = await ensureSession();
  const booking = await loadOwnedBooking(id, user);
  if (!booking) return { ok: false, message: "Booking not found." };
  if (booking.rescheduleState !== "AWAITING") {
    return { ok: false, message: "This booking isn't awaiting confirmation." };
  }

  await prisma.booking.update({
    where: { id },
    data: {
      rescheduleState: "NONE",
      previousStartAt: null,
      previousEndAt: null,
      rescheduleRequestedAt: null,
    },
  });
  try {
    await sendBookingMessage(id, "RESCHEDULE_CONFIRMED");
  } catch (err) {
    console.error("Reschedule confirmation failed:", err);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  return { ok: true, message: "Reschedule confirmed." };
}

/** Revert a pending reschedule back to the original time (customer said no). */
export async function revertReschedule(id: string): Promise<ActionResult> {
  const user = await ensureSession();
  const booking = await loadOwnedBooking(id, user);
  if (!booking) return { ok: false, message: "Booking not found." };
  if (!booking.previousStartAt || !booking.previousEndAt) {
    return { ok: false, message: "No previous time to revert to." };
  }

  await prisma.booking.update({
    where: { id },
    data: {
      startAt: booking.previousStartAt,
      endAt: booking.previousEndAt,
      rescheduleState: "NONE",
      previousStartAt: null,
      previousEndAt: null,
      rescheduleRequestedAt: null,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  return { ok: true, message: "Reverted to the original time." };
}

// ---------------------------------------------------------------------------
// Availability — working hours + time off
// ---------------------------------------------------------------------------

export async function saveWorkingHours(
  technicianId: string,
  blocks: { weekday: number; startMinute: number; endMinute: number }[],
): Promise<ActionResult> {
  const user = await ensureSession();
  if (user.role !== "OWNER" && technicianId !== user.technicianId) {
    return { ok: false, message: "You can only edit your own hours." };
  }
  // Validate.
  for (const b of blocks) {
    if (
      b.weekday < 0 ||
      b.weekday > 6 ||
      b.startMinute < 0 ||
      b.endMinute > 1440 ||
      b.startMinute >= b.endMinute
    ) {
      return { ok: false, message: "Each block must end after it starts." };
    }
  }

  await prisma.$transaction([
    prisma.workingHours.deleteMany({ where: { technicianId } }),
    prisma.workingHours.createMany({
      data: blocks.map((b) => ({ ...b, technicianId })),
    }),
  ]);
  revalidatePath("/admin/availability");
  return { ok: true, message: "Working hours saved." };
}

export async function addTimeOff(
  technicianId: string,
  startIso: string,
  endIso: string,
  reason: string,
): Promise<ActionResult> {
  const user = await ensureSession();
  if (user.role !== "OWNER" && technicianId !== user.technicianId) {
    return { ok: false, message: "You can only edit your own time off." };
  }
  const startAt = new Date(startIso);
  const endAt = new Date(endIso);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
    return { ok: false, message: "Please choose a valid start and end." };
  }
  await prisma.timeOff.create({
    data: { technicianId, startAt, endAt, reason: reason.trim() },
  });
  revalidatePath("/admin/availability");
  return { ok: true, message: "Time off added." };
}

export async function deleteTimeOff(id: string): Promise<ActionResult> {
  const user = await ensureSession();
  const t = await prisma.timeOff.findUnique({ where: { id } });
  if (!t) return { ok: false, message: "Not found." };
  if (user.role !== "OWNER" && t.technicianId !== user.technicianId) {
    return { ok: false, message: "Not allowed." };
  }
  await prisma.timeOff.delete({ where: { id } });
  revalidatePath("/admin/availability");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Services (owner)
// ---------------------------------------------------------------------------

export interface ServiceInput {
  name: string;
  description: string;
  durationMin: number;
  pricePence: number;
  priceText: string;
  category: string;
  active: boolean;
  displayOrder: number;
}

export async function upsertService(
  id: string | null,
  data: ServiceInput,
): Promise<ActionResult> {
  await ensureOwner();
  if (!data.name.trim()) return { ok: false, message: "Name is required." };
  if (data.durationMin <= 0) return { ok: false, message: "Duration must be positive." };

  if (id) {
    await prisma.service.update({ where: { id }, data });
  } else {
    await prisma.service.create({ data });
  }
  revalidatePath("/admin/services");
  revalidatePath("/");
  return { ok: true, message: "Service saved." };
}

export async function deleteService(id: string): Promise<ActionResult> {
  await ensureOwner();
  const count = await prisma.booking.count({ where: { serviceId: id } });
  if (count > 0) {
    // Keep history intact — deactivate instead of deleting.
    await prisma.service.update({ where: { id }, data: { active: false } });
    revalidatePath("/admin/services");
    revalidatePath("/");
    return { ok: true, message: "Service has bookings — hidden instead of deleted." };
  }
  await prisma.service.delete({ where: { id } });
  revalidatePath("/admin/services");
  revalidatePath("/");
  return { ok: true, message: "Service deleted." };
}

// ---------------------------------------------------------------------------
// Technicians (owner)
// ---------------------------------------------------------------------------

export interface TechnicianInput {
  name: string;
  bio: string;
  active: boolean;
  serviceIds: string[];
}

export async function createTechnician(
  data: TechnicianInput & { email: string; password: string; role: string },
): Promise<ActionResult> {
  await ensureOwner();
  const email = data.email.toLowerCase().trim();
  if (!data.name.trim()) return { ok: false, message: "Name is required." };
  if (!email || !data.password || data.password.length < 6) {
    return { ok: false, message: "A valid email and a 6+ char password are required." };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, message: "That email is already in use." };

  // Unique slug.
  let slug = slugify(data.name);
  let n = 1;
  while (await prisma.technician.findUnique({ where: { slug } })) {
    slug = `${slugify(data.name)}-${++n}`;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const maxOrder = await prisma.technician.aggregate({ _max: { displayOrder: true } });

  const user = await prisma.user.create({
    data: { email, passwordHash, role: data.role === "OWNER" ? "OWNER" : "STAFF" },
  });
  await prisma.technician.create({
    data: {
      name: data.name.trim(),
      slug,
      bio: data.bio.trim(),
      active: data.active,
      displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
      userId: user.id,
      services: { connect: data.serviceIds.map((sid) => ({ id: sid })) },
    },
  });
  revalidatePath("/admin/technicians");
  revalidatePath("/");
  return { ok: true, message: "Technician added." };
}

export async function updateTechnician(
  id: string,
  data: TechnicianInput,
): Promise<ActionResult> {
  await ensureOwner();
  await prisma.technician.update({
    where: { id },
    data: {
      name: data.name.trim(),
      bio: data.bio.trim(),
      active: data.active,
      services: { set: data.serviceIds.map((sid) => ({ id: sid })) },
    },
  });
  revalidatePath("/admin/technicians");
  revalidatePath("/");
  return { ok: true, message: "Technician updated." };
}

export async function removeTechnician(id: string): Promise<ActionResult> {
  const owner = await ensureOwner();
  const tech = await prisma.technician.findUnique({ where: { id } });
  if (!tech) return { ok: false, message: "Not found." };
  if (tech.userId === owner.id) {
    return { ok: false, message: "You can't remove your own account." };
  }
  const bookings = await prisma.booking.count({ where: { technicianId: id } });
  if (bookings > 0) {
    await prisma.technician.update({ where: { id }, data: { active: false } });
    revalidatePath("/admin/technicians");
    revalidatePath("/");
    return { ok: true, message: "Has bookings — deactivated instead of deleted." };
  }
  const userId = tech.userId;
  await prisma.technician.delete({ where: { id } });
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  revalidatePath("/admin/technicians");
  revalidatePath("/");
  return { ok: true, message: "Technician removed." };
}

// ---------------------------------------------------------------------------
// Account (any signed-in user changes their own password)
// ---------------------------------------------------------------------------

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult> {
  const user = await ensureSession();
  if (newPassword.length < 6) {
    return { ok: false, message: "New password must be at least 6 characters." };
  }
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { ok: false, message: "Account not found." };

  const ok = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!ok) return { ok: false, message: "Your current password is incorrect." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true, message: "Password updated." };
}

// ---------------------------------------------------------------------------
// Manual booking creation (from the calendar)
// ---------------------------------------------------------------------------

export interface ManualBookingInput {
  technicianId: string;
  serviceId: string;
  startIso: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  notify: boolean;
}

/** Create a booking by hand (phone/DM booking) from the admin calendar. */
export async function createManualBooking(
  input: ManualBookingInput,
): Promise<ActionResult> {
  const user = await ensureSession();
  if (user.role !== "OWNER" && input.technicianId !== user.technicianId) {
    return { ok: false, message: "You can only add bookings for yourself." };
  }
  if (input.customerName.trim().length < 2) {
    return { ok: false, message: "Please enter the customer's name." };
  }
  if (input.customerPhone.replace(/[^\d]/g, "").length < 7) {
    return { ok: false, message: "Please enter a valid phone number." };
  }

  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service) return { ok: false, message: "Service not found." };

  const start = new Date(input.startIso);
  if (Number.isNaN(start.getTime())) return { ok: false, message: "Invalid time." };
  const end = new Date(start.getTime() + service.durationMin * 60_000);
  const business = await getBusiness();

  const booking = await prisma.booking.create({
    data: {
      reference: generateReference(),
      technicianId: input.technicianId,
      serviceId: service.id,
      customerName: input.customerName.trim(),
      customerPhone: normalizeUkPhone(input.customerPhone),
      notes: (input.notes ?? "").trim(),
      startAt: start,
      endAt: end,
      status: "CONFIRMED",
      bufferBeforeMin: business.bufferBeforeMin,
      bufferAfterMin: business.bufferAfterMin,
    },
  });

  if (input.notify) {
    try {
      await sendBookingMessage(booking.id, "CONFIRMATION");
    } catch (err) {
      console.error("Manual booking confirmation failed:", err);
    }
  }
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  return { ok: true, message: "Booking added." };
}

/** Block a period as time off from the calendar (e.g. a personal appointment). */
export async function blockTime(
  technicianId: string,
  startIso: string,
  endIso: string,
  reason: string,
): Promise<ActionResult> {
  const user = await ensureSession();
  if (user.role !== "OWNER" && technicianId !== user.technicianId) {
    return { ok: false, message: "You can only block your own time." };
  }
  const startAt = new Date(startIso);
  const endAt = new Date(endIso);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
    return { ok: false, message: "Invalid time range." };
  }
  await prisma.timeOff.create({
    data: { technicianId, startAt, endAt, reason: reason.trim() || "Blocked" },
  });
  revalidatePath("/admin");
  return { ok: true, message: "Time blocked." };
}

// ---------------------------------------------------------------------------
// Business settings (owner)
// ---------------------------------------------------------------------------

export interface BusinessInput {
  name: string;
  tagline: string;
  aboutHeading: string;
  aboutBody: string;
  whatsappNumber: string;
  email: string;
  addressLine: string;
  instagram: string;
  colorPrimary: string;
  colorAccent: string;
  timezone: string;
  slotIntervalMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  cancellationWindowHrs: number;
}

export async function updateBusiness(data: BusinessInput): Promise<ActionResult> {
  await ensureOwner();
  await prisma.business.update({
    where: { id: "business" },
    data: {
      ...data,
      whatsappNumber: data.whatsappNumber.replace(/[^\d]/g, ""),
      instagram: data.instagram.replace(/^@/, "").trim(),
    },
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { ok: true, message: "Settings saved." };
}
