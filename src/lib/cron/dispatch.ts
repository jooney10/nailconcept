import { prisma } from "@/lib/prisma";
import { sendBookingMessage } from "@/lib/messaging";

// Scheduled message dispatch, designed to run hourly (Vercel Cron). Everything
// is idempotent: a message type is only sent once per booking, guarded by the
// MessageLog, so re-runs and overlapping runs never double-send.

const HOUR = 3600_000;

export interface DispatchSummary {
  remindersSent: number;
  reviewsSent: number;
  reminderRefs: string[];
  reviewRefs: string[];
  ranAt: string;
}

/**
 * 24-hour reminders: any CONFIRMED booking starting within the next 24 hours
 * that hasn't had a reminder yet. Using a "within 24h" window (rather than an
 * exact 23–24h slice) means a missed cron run still catches up on the next tick.
 */
async function runReminders(now: Date): Promise<{ count: number; refs: string[] }> {
  const windowEnd = new Date(now.getTime() + 24 * HOUR);
  const due = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      startAt: { gt: now, lte: windowEnd },
      messages: { none: { type: "REMINDER_24H" } },
    },
    select: { id: true, reference: true },
  });

  const refs: string[] = [];
  for (const b of due) {
    try {
      await sendBookingMessage(b.id, "REMINDER_24H");
      refs.push(b.reference);
    } catch (err) {
      console.error(`Reminder failed for ${b.reference}:`, err);
    }
  }
  return { count: refs.length, refs };
}

/**
 * Post-session review requests: any booking that finished in the last 72 hours
 * and is still CONFIRMED (i.e. wasn't marked no-show/cancelled). We send the
 * review request and close the booking out as COMPLETED. The 72h lookback stops
 * very old bookings from being messaged if the job was paused for a while.
 */
async function runReviews(now: Date): Promise<{ count: number; refs: string[] }> {
  const lookback = new Date(now.getTime() - 72 * HOUR);
  const due = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      endAt: { lt: now, gte: lookback },
      messages: { none: { type: "REVIEW_REQUEST" } },
    },
    select: { id: true, reference: true },
  });

  const refs: string[] = [];
  for (const b of due) {
    try {
      await sendBookingMessage(b.id, "REVIEW_REQUEST");
      await prisma.booking.update({ where: { id: b.id }, data: { status: "COMPLETED" } });
      refs.push(b.reference);
    } catch (err) {
      console.error(`Review request failed for ${b.reference}:`, err);
    }
  }
  return { count: refs.length, refs };
}

export async function dispatchScheduledMessages(): Promise<DispatchSummary> {
  const now = new Date();
  const reminders = await runReminders(now);
  const reviews = await runReviews(now);
  return {
    remindersSent: reminders.count,
    reviewsSent: reviews.count,
    reminderRefs: reminders.refs,
    reviewRefs: reviews.refs,
    ranAt: now.toISOString(),
  };
}
