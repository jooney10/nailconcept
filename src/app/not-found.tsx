import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl text-white"
          style={{ background: "var(--brand)" }}
          aria-hidden
        >
          ✦
        </div>
        <h1 className="mt-6 text-[clamp(2rem,6vw,3rem)]">Page not found</h1>
        <p className="mt-3 text-[var(--ink-soft)]">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link href="/book" className="btn btn-ghost">
            Book an appointment
          </Link>
        </div>
      </div>
    </div>
  );
}
