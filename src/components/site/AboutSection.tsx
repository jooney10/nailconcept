import type { BusinessRecord } from "@/lib/business";

type Technician = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  photoUrl: string;
};

function Avatar({ name, photoUrl }: { name: string; photoUrl: string }) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-14 w-14 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="grid h-14 w-14 place-items-center rounded-full font-[family-name:var(--font-fraunces)] text-lg text-white"
      style={{ background: "var(--brand)" }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function AboutSection({
  business,
  technicians,
}: {
  business: BusinessRecord;
  technicians: Technician[];
}) {
  return (
    <section id="about" className="section scroll-mt-20">
      <div className="wrap grid gap-12 md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative">
          <div
            className="aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-lg)]"
            style={{
              background:
                "linear-gradient(160deg, var(--blush) 0%, var(--blush-deep) 100%)",
            }}
          >
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <div
                  className="mx-auto grid h-24 w-24 place-items-center rounded-full font-[family-name:var(--font-fraunces)] text-4xl text-white"
                  style={{ background: "var(--brand)" }}
                >
                  {business.name.charAt(0)}
                </div>
                <p className="mt-4 font-[family-name:var(--font-fraunces)] text-xl">
                  @{business.instagram}
                </p>
                <p className="text-sm text-[var(--ink-soft)]">
                  Photo placeholder
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <span className="eyebrow">About</span>
          <h2 className="mt-3 text-[clamp(2rem,4.5vw,3rem)]">
            {business.aboutHeading}
          </h2>
          <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-[var(--ink-soft)]">
            {business.aboutBody ||
              "Add your story from the admin dashboard — a warm few lines about who you are and what you love creating."}
          </p>

          {technicians.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-extrabold uppercase tracking-[0.15em] text-[var(--brand-dark)]">
                {technicians.length > 1 ? "The team" : "Your technician"}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {technicians.map((t) => (
                  <div
                    key={t.id}
                    className="surface flex items-center gap-3 p-4"
                  >
                    <Avatar name={t.name} photoUrl={t.photoUrl} />
                    <div>
                      <div className="font-[family-name:var(--font-fraunces)] text-lg">
                        {t.name}
                      </div>
                      {t.bio && (
                        <div className="text-sm text-[var(--grey)]">{t.bio}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
