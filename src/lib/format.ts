// Presentation helpers shared across the customer site and admin.

/** Format a price stored in pence. Returns priceText override when set, or
 *  "Price on request" when pence is 0 and no override exists. */
export function formatPrice(pricePence: number, priceText?: string): string {
  if (priceText && priceText.trim()) return priceText;
  if (!pricePence || pricePence <= 0) return "Price on request";
  const pounds = pricePence / 100;
  return Number.isInteger(pounds)
    ? `£${pounds}`
    : `£${pounds.toFixed(2)}`;
}

/** Human-friendly duration: 45 -> "45 min", 75 -> "1 hr 15", 120 -> "2 hr". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins}`;
}

/** wa.me deep link with a pre-filled message. Number is E.164 digits, no +. */
export function whatsappLink(number: string, message?: string): string {
  const clean = (number || "").replace(/[^\d]/g, "");
  const base = `https://wa.me/${clean}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
