"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTechnician,
  updateTechnician,
  removeTechnician,
} from "@/lib/admin/actions";

interface TechRow {
  id: string;
  name: string;
  bio: string;
  active: boolean;
  role: string;
  email: string;
  serviceIds: string[];
  isSelf: boolean;
  bookingCount: number;
}
interface ServiceOpt {
  id: string;
  name: string;
}

type Mode = { kind: "list" } | { kind: "new" } | { kind: "edit"; tech: TechRow };

export function TechniciansManager({
  technicians,
  services,
}: {
  technicians: TechRow[];
  services: ServiceOpt[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const remove = (t: TechRow) => {
    if (!window.confirm(`Remove ${t.name}? ${t.bookingCount > 0 ? "They have bookings, so they'll be deactivated." : ""}`)) return;
    startTransition(async () => {
      const res = await removeTechnician(t.id);
      setNote(res.message ?? null);
      router.refresh();
    });
  };

  if (mode.kind !== "list") {
    return (
      <TechForm
        services={services}
        tech={mode.kind === "edit" ? mode.tech : null}
        onDone={() => {
          setMode({ kind: "list" });
          router.refresh();
        }}
        onCancel={() => setMode({ kind: "list" })}
      />
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-[var(--grey)]">{note}</span>
        <button onClick={() => setMode({ kind: "new" })} className="btn btn-primary">
          + Add technician
        </button>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-white">
        <ul className="divide-y divide-[var(--border)]">
          {technicians.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t.name}</span>
                  <span className="rounded-full bg-[var(--blush)] px-2 py-0.5 text-[11px] font-bold text-[var(--brand-dark)]">
                    {t.role === "OWNER" ? "Owner" : "Staff"}
                  </span>
                  {!t.active && (
                    <span className="rounded-full bg-[#efe9e7] px-2 py-0.5 text-[11px] font-bold text-[var(--grey)]">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-sm text-[var(--grey)]">
                  {t.email} · offers {t.serviceIds.length} service{t.serviceIds.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode({ kind: "edit", tech: t })}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-bold hover:border-[var(--brand)]"
                >
                  Edit
                </button>
                {!t.isSelf && (
                  <button
                    onClick={() => remove(t)}
                    disabled={pending}
                    className="rounded-lg px-3 py-1.5 text-sm font-bold text-[var(--rose-dark)] disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TechForm({
  services,
  tech,
  onDone,
  onCancel,
}: {
  services: ServiceOpt[];
  tech: TechRow | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(tech?.name ?? "");
  const [bio, setBio] = useState(tech?.bio ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [active, setActive] = useState(tech?.active ?? true);
  const [serviceIds, setServiceIds] = useState<string[]>(
    tech?.serviceIds ?? services.map((s) => s.id),
  );
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setServiceIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = () => {
    startTransition(async () => {
      const res = tech
        ? await updateTechnician(tech.id, { name, bio, active, serviceIds })
        : await createTechnician({ name, bio, active, serviceIds, email, password, role });
      if (res.ok) onDone();
      else setError(res.message ?? "Could not save.");
    });
  };

  return (
    <div className="mt-6 max-w-xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-6">
      <h2 className="text-xl">{tech ? `Edit ${tech.name}` : "Add technician"}</h2>
      <div className="mt-4 grid gap-4">
        <Field label="Name">
          <input className="fld" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Bio" hint="Shown on the public site">
          <textarea className="fld min-h-[60px]" value={bio} onChange={(e) => setBio(e.target.value)} />
        </Field>

        {!tech && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Login email">
                <input type="email" className="fld" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Temp password" hint="6+ characters">
                <input type="text" className="fld" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            </div>
            <Field label="Role">
              <select className="fld" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="STAFF">Staff (manages own bookings & hours)</option>
                <option value="OWNER">Owner (full access)</option>
              </select>
            </Field>
          </>
        )}

        <div>
          <span className="mb-2 block text-sm font-bold">Services offered</span>
          <div className="grid grid-cols-2 gap-2">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggle(s.id)} />
                {s.name}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active (accepting bookings)
        </label>

        {error && <p className="text-sm font-semibold text-[var(--rose-dark)]">{error}</p>}
      </div>
      <div className="mt-5 flex gap-3">
        <button onClick={submit} disabled={pending} className="btn btn-primary disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      {hint && <span className="mb-1 block text-xs text-[var(--grey)]">{hint}</span>}
      {children}
    </label>
  );
}
