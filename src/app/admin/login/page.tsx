"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Those details don't match. Please try again.");
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="surface w-full max-w-sm p-8">
        <h1 className="text-center text-2xl">Admin sign in</h1>
        <p className="mt-1 text-center text-sm text-[var(--grey)]">
          Manage your bookings and availability
        </p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fld"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="fld"
              required
            />
          </label>
          {error && (
            <p className="text-sm font-semibold text-[var(--rose-dark)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
