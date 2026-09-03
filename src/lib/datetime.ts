import { toZonedTime } from "date-fns-tz";

const WEEKDAY = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTH = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** e.g. "Friday 5 September, 9:00 am" in the business timezone. */
export function formatAppointment(date: Date, tz: string): string {
  const z = toZonedTime(date, tz);
  const h24 = z.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "am" : "pm";
  return `${WEEKDAY[z.getDay()]} ${z.getDate()} ${MONTH[z.getMonth()]}, ${h12}:${pad(
    z.getMinutes(),
  )} ${ampm}`;
}

/** e.g. "Fri 5 Sep · 9:00 am" — compact form for admin lists. */
export function formatShort(date: Date, tz: string): string {
  const z = toZonedTime(date, tz);
  const h24 = z.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "am" : "pm";
  return `${WEEKDAY[z.getDay()].slice(0, 3)} ${z.getDate()} ${MONTH[
    z.getMonth()
  ].slice(0, 3)} · ${h12}:${pad(z.getMinutes())} ${ampm}`;
}

/** "9:00 am" time only. */
export function formatTime(date: Date, tz: string): string {
  const z = toZonedTime(date, tz);
  const h24 = z.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "am" : "pm";
  return `${h12}:${pad(z.getMinutes())} ${ampm}`;
}
