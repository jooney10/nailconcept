// Central definitions for the string-based "enum" fields on the models.
// Kept in one place so validation, UI, and business logic stay in sync.

export const USER_ROLES = ["OWNER", "STAFF"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BOOKING_STATUSES = [
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
};

export const MESSAGE_TYPES = [
  "CONFIRMATION",
  "REMINDER_24H",
  "REVIEW_REQUEST",
  "CANCELLATION",
  "RESCHEDULE_REQUEST",
  "RESCHEDULE_CONFIRMED",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  CONFIRMATION: "Booking confirmation",
  REMINDER_24H: "24-hour reminder",
  REVIEW_REQUEST: "Review request",
  CANCELLATION: "Cancellation notice",
  RESCHEDULE_REQUEST: "Reschedule request",
  RESCHEDULE_CONFIRMED: "Reschedule confirmed",
};

export const MESSAGE_STATUSES = ["STUBBED", "SENT", "FAILED", "SKIPPED"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
