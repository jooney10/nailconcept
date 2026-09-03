import Link from "next/link";
import { formatDuration, formatPrice } from "@/lib/format";

type Service = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  pricePence: number;
  priceText: string;
  active: boolean;
};

type Group = { category: string; items: Service[] };

export function ServicesSection({ groups }: { groups: Group[] }) {
  return (
    <section id="services" className="section scroll-mt-20">
      <div className="wrap">
        <div className="max-w-xl">
          <span className="eyebrow">The menu</span>
          <h2 className="mt-3 text-[clamp(2rem,4.5vw,3rem)]">Treatments &amp; prices</h2>
          <p className="mt-3 text-[var(--ink-soft)]">
            Every treatment includes shaping, cuticle care and a proper bit of
            pampering. Durations are exact so your slot is always yours.
          </p>
        </div>

        <div className="mt-10 space-y-10">
          {groups.map((group) => (
            <div key={group.category}>
              <h3 className="mb-4 flex items-center gap-3 text-sm font-extrabold uppercase tracking-[0.15em] text-[var(--brand-dark)]">
                {group.category}
                <span className="h-px flex-1 bg-[var(--border)]" />
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.items.map((s) => (
                  <article
                    key={s.id}
                    className="surface flex flex-col gap-3 p-5 transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="font-[family-name:var(--font-fraunces)] text-xl">
                        {s.name}
                      </h4>
                      <span
                        className="whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold"
                        style={{ background: "var(--blush)", color: "var(--brand-dark)" }}
                      >
                        {formatPrice(s.pricePence, s.priceText)}
                      </span>
                    </div>
                    {s.description && (
                      <p className="text-sm text-[var(--ink-soft)]">{s.description}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-1">
                      <span className="text-sm font-semibold text-[var(--grey)]">
                        ⏱ {formatDuration(s.durationMin)}
                      </span>
                      <Link
                        href={`/book?service=${s.id}`}
                        className="text-sm font-bold text-[var(--brand-dark)] transition-colors hover:text-[var(--brand)]"
                      >
                        Book this →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
