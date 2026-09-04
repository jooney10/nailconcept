// Social proof. These are clearly-labelled sample testimonials for the owner to
// replace with real reviews (mirrors the placeholder gallery approach) — never
// presented as genuine until swapped for real customer quotes.

const SAMPLE_REVIEWS = [
  {
    quote:
      "Honestly the best nails I've ever had. Abigail takes her time and they last for weeks — I won't go anywhere else now.",
    name: "Emma R.",
    detail: "BIAB Overlay",
  },
  {
    quote:
      "So relaxing and such a lovely space. Booking online was so easy and I got a reminder the day before. 10/10.",
    name: "Katie L.",
    detail: "Gel Manicure",
  },
  {
    quote:
      "My nails always get compliments. Abigail is so talented and really listens to what you want. Highly recommend!",
    name: "Sophie T.",
    detail: "Full Set + Nail Art",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: "var(--accent)" }} aria-hidden>
          ★
        </span>
      ))}
    </div>
  );
}

export function ReviewsSection() {
  return (
    <section className="section" aria-label="Reviews">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <span className="eyebrow">Loved by clients</span>
            <h2 className="mt-3 text-[clamp(2rem,4.5vw,3rem)]">Kind words</h2>
          </div>
          <span className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--grey)]">
            Sample reviews
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {SAMPLE_REVIEWS.map((r) => (
            <figure key={r.name} className="surface flex flex-col gap-3 p-6">
              <Stars />
              <blockquote className="text-[var(--ink-soft)]">“{r.quote}”</blockquote>
              <figcaption className="mt-auto pt-2 text-sm font-bold">
                {r.name}
                <span className="font-semibold text-[var(--grey)]"> · {r.detail}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
