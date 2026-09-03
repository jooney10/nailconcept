import Link from "next/link";
import { whatsappLink } from "@/lib/format";
import type { BusinessRecord } from "@/lib/business";

// Decorative "nail polish swatch" arrangement — stands in for hero photography
// and reads unmistakably as a nail studio without needing a real image.
function SwatchVisual() {
  const swatches = [
    { c: "#c9716b", x: 60, y: 70, r: 52 },
    { c: "#e8b4ad", x: 168, y: 48, r: 40 },
    { c: "#a6534e", x: 250, y: 96, r: 46 },
    { c: "#c9a25a", x: 120, y: 168, r: 44 },
    { c: "#f0d9c0", x: 224, y: 196, r: 38 },
    { c: "#8a5a72", x: 300, y: 168, r: 30 },
  ];
  return (
    <svg
      viewBox="0 0 360 300"
      className="h-full w-full"
      role="img"
      aria-label="A palette of nail polish colours"
    >
      <defs>
        <radialGradient id="sheen" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
        </radialGradient>
      </defs>
      {swatches.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r={s.r} fill={s.c} />
          <circle cx={s.x} cy={s.y} r={s.r} fill="url(#sheen)" />
        </g>
      ))}
    </svg>
  );
}

export function Hero({ business }: { business: BusinessRecord }) {
  return (
    <section className="relative overflow-hidden">
      {/* soft blush wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 90% at 85% 0%, var(--blush) 0%, transparent 55%), radial-gradient(90% 80% at 0% 20%, #fbeee7 0%, transparent 60%)",
        }}
      />
      <div className="wrap grid items-center gap-10 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
        <div>
          <span className="eyebrow">
            {business.addressLine}
          </span>
          <h1 className="mt-4 text-[clamp(2.6rem,7vw,4.6rem)]">
            Beautiful nails,
            <br />
            <span style={{ color: "var(--brand)" }}>booked in seconds.</span>
          </h1>
          <p className="mt-5 max-w-[46ch] text-lg text-[var(--ink-soft)]">
            {business.tagline}. Pick a treatment, see real-time availability, and
            lock in your slot — no DMs, no back-and-forth, no double bookings.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/book">
              Book an appointment →
            </Link>
            {business.whatsappNumber && (
              <a
                className="btn btn-whatsapp"
                href={whatsappLink(
                  business.whatsappNumber,
                  `Hi ${business.name}, I'd like to ask about an appointment.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ask on WhatsApp
              </a>
            )}
          </div>
          <p className="mt-5 text-sm text-[var(--grey)]">
            Instant confirmation · Friendly reminders · Easy to reschedule
          </p>
        </div>

        <div className="surface relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden p-6">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(160deg, #fff 0%, var(--blush) 100%)",
            }}
            aria-hidden
          />
          <div className="relative grid h-full grid-rows-[1fr_auto] gap-3">
            <SwatchVisual />
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center backdrop-blur">
              <div className="font-[family-name:var(--font-fraunces)] text-lg">
                @{business.instagram}
              </div>
              <div className="text-xs text-[var(--grey)]">
                Gel · BIAB · Nail art · Pedicures
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
