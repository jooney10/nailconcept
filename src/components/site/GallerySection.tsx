// Placeholder portfolio. Each tile is a designed gradient "nail" swatch so the
// section looks intentional before real photography is dropped in (admin can add
// real image URLs later). Captions hint at the style of work.

const TILES = [
  { name: "Blush BIAB", from: "#f3d7d0", to: "#c9716b", shape: "almond" },
  { name: "Chrome tips", from: "#e7e0ea", to: "#9b8aa6", shape: "square" },
  { name: "French fade", from: "#fbeee7", to: "#e8b4ad", shape: "almond" },
  { name: "Gold flecks", from: "#f6e7c9", to: "#c9a25a", shape: "coffin" },
  { name: "Soft mauve", from: "#eeddea", to: "#a86a8f", shape: "square" },
  { name: "Milky gel", from: "#fdf6f2", to: "#f0d9c0", shape: "almond" },
];

function NailShape({ shape, color }: { shape: string; color: string }) {
  // Simple stylised nail silhouettes.
  const paths: Record<string, string> = {
    almond: "M20 4 C30 4 34 22 30 40 C28 52 12 52 10 40 C6 22 10 4 20 4 Z",
    square: "M11 6 h18 a3 3 0 0 1 3 3 v34 a2 2 0 0 1 -2 2 h-20 a2 2 0 0 1 -2 -2 v-34 a3 3 0 0 1 3 -3 Z",
    coffin: "M13 5 h14 l4 30 -7 9 h-8 l-7 -9 Z",
  };
  return (
    <svg viewBox="0 0 40 52" className="h-16 w-12 drop-shadow-sm">
      <path d={paths[shape] ?? paths.almond} fill={color} />
      <path
        d={paths[shape] ?? paths.almond}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function GallerySection() {
  return (
    <section
      id="gallery"
      className="section scroll-mt-20"
      style={{ background: "color-mix(in srgb, var(--blush) 45%, var(--cream))" }}
    >
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <span className="eyebrow">Recent work</span>
            <h2 className="mt-3 text-[clamp(2rem,4.5vw,3rem)]">The gallery</h2>
            <p className="mt-3 text-[var(--ink-soft)]">
              A little taste of the sets I love creating. Follow along for the
              latest.
            </p>
          </div>
          <span className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--grey)]">
            Placeholder images
          </span>
        </div>

        <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {TILES.map((t) => (
            <figure
              key={t.name}
              className="group relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]"
              style={{ background: `linear-gradient(150deg, ${t.from}, ${t.to})` }}
            >
              <div className="grid h-full place-items-center transition-transform duration-300 group-hover:scale-105">
                <NailShape shape={t.shape} color="rgba(255,255,255,0.9)" />
              </div>
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-3 py-2 text-sm font-semibold text-white">
                {t.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
