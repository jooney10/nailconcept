// Minimal wrapper so /admin/login stays reachable. The guarded shell lives in
// the (app) route group's layout.
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[var(--cream)]">{children}</div>;
}
