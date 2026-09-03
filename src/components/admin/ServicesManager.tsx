"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDuration, formatPrice } from "@/lib/format";
import { upsertService, deleteService } from "@/lib/admin/actions";

interface ServiceRow {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  pricePence: number;
  priceText: string;
  category: string;
  active: boolean;
  displayOrder: number;
}

interface Draft {
  id: string | null;
  name: string;
  description: string;
  category: string;
  durationMin: string;
  pricePounds: string;
  priceText: string;
  active: boolean;
  displayOrder: number;
}

function toDraft(s: ServiceRow | null, order: number): Draft {
  if (!s) {
    return {
      id: null, name: "", description: "", category: "Nails",
      durationMin: "45", pricePounds: "", priceText: "", active: true, displayOrder: order,
    };
  }
  return {
    id: s.id, name: s.name, description: s.description, category: s.category,
    durationMin: String(s.durationMin),
    pricePounds: s.pricePence ? String(s.pricePence / 100) : "",
    priceText: s.priceText, active: s.active, displayOrder: s.displayOrder,
  };
}

export function ServicesManager({ services }: { services: ServiceRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const save = () => {
    if (!draft) return;
    const data = {
      name: draft.name,
      description: draft.description,
      category: draft.category.trim() || "Nails",
      durationMin: parseInt(draft.durationMin, 10) || 0,
      pricePence: draft.pricePounds ? Math.round(parseFloat(draft.pricePounds) * 100) : 0,
      priceText: draft.priceText,
      active: draft.active,
      displayOrder: draft.displayOrder,
    };
    startTransition(async () => {
      const res = await upsertService(draft.id, data);
      setNote(res.message ?? null);
      if (res.ok) setDraft(null);
      router.refresh();
    });
  };

  const remove = (s: ServiceRow) => {
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteService(s.id);
      setNote(res.message ?? null);
      router.refresh();
    });
  };

  if (draft) {
    return (
      <div className="mt-6 max-w-xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-6">
        <h2 className="text-xl">{draft.id ? "Edit service" : "New service"}</h2>
        <div className="mt-4 grid gap-4">
          <L label="Name">
            <input className="fld" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </L>
          <L label="Description">
            <textarea className="fld min-h-[70px]" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </L>
          <div className="grid grid-cols-2 gap-4">
            <L label="Category">
              <input className="fld" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
            </L>
            <L label="Duration (min)">
              <input type="number" min="5" step="5" className="fld" value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })} />
            </L>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <L label="Price (£)" hint="Leave blank if using price text">
              <input type="number" min="0" step="0.5" className="fld" value={draft.pricePounds} onChange={(e) => setDraft({ ...draft, pricePounds: e.target.value })} />
            </L>
            <L label="Price text" hint='e.g. "from £30", "Coming soon"'>
              <input className="fld" value={draft.priceText} onChange={(e) => setDraft({ ...draft, priceText: e.target.value })} />
            </L>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Bookable (visible on the site)
          </label>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={save} disabled={pending} className="btn btn-primary disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setDraft(null)} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-[var(--grey)]">{note}</span>
        <button onClick={() => setDraft(toDraft(null, services.length + 1))} className="btn btn-primary">
          + New service
        </button>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-white">
        <ul className="divide-y divide-[var(--border)]">
          {services.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.name}</span>
                  {!s.active && (
                    <span className="rounded-full bg-[var(--blush)] px-2 py-0.5 text-[11px] font-bold text-[var(--brand-dark)]">
                      Hidden
                    </span>
                  )}
                </div>
                <div className="text-sm text-[var(--grey)]">
                  {s.category} · {formatDuration(s.durationMin)} · {formatPrice(s.pricePence, s.priceText)}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDraft(toDraft(s, s.displayOrder))} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-bold hover:border-[var(--brand)]">
                  Edit
                </button>
                <button onClick={() => remove(s)} disabled={pending} className="rounded-lg px-3 py-1.5 text-sm font-bold text-[var(--rose-dark)] disabled:opacity-50">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function L({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      {hint && <span className="mb-1 block text-xs text-[var(--grey)]">{hint}</span>}
      {children}
    </label>
  );
}
