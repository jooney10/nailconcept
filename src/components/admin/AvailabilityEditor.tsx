"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WEEKDAYS } from "@/lib/enums";
import { saveWorkingHours, addTimeOff, deleteTimeOff } from "@/lib/admin/actions";

interface Block {
  start: string; // "HH:MM"
  end: string;
}
interface TimeOffItem {
  id: string;
  startAt: string; // ISO
  endAt: string;
  reason: string;
}

const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

const toHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export function AvailabilityEditor({
  technicianId,
  initialBlocks,
  initialTimeOff,
}: {
  technicianId: string;
  initialBlocks: { weekday: number; startMinute: number; endMinute: number }[];
  initialTimeOff: TimeOffItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  // Group blocks by weekday.
  const [byDay, setByDay] = useState<Record<number, Block[]>>(() => {
    const map: Record<number, Block[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const b of initialBlocks) {
      map[b.weekday].push({ start: toHHMM(b.startMinute), end: toHHMM(b.endMinute) });
    }
    return map;
  });

  const addBlock = (wd: number) =>
    setByDay((s) => ({ ...s, [wd]: [...s[wd], { start: "09:00", end: "17:00" }] }));
  const removeBlock = (wd: number, i: number) =>
    setByDay((s) => ({ ...s, [wd]: s[wd].filter((_, idx) => idx !== i) }));
  const editBlock = (wd: number, i: number, field: "start" | "end", val: string) =>
    setByDay((s) => ({
      ...s,
      [wd]: s[wd].map((b, idx) => (idx === i ? { ...b, [field]: val } : b)),
    }));

  const save = () => {
    const blocks: { weekday: number; startMinute: number; endMinute: number }[] = [];
    for (const wd of DISPLAY_ORDER) {
      for (const b of byDay[wd]) {
        blocks.push({ weekday: wd, startMinute: toMin(b.start), endMinute: toMin(b.end) });
      }
    }
    startTransition(async () => {
      const res = await saveWorkingHours(technicianId, blocks);
      setNote(res.message ?? null);
      router.refresh();
    });
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      {/* Weekly hours */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5">
        <h2 className="text-xl">Weekly hours</h2>
        <p className="mt-1 text-sm text-[var(--grey)]">
          Add one or more time blocks per day. Split a day (e.g. a lunch break)
          by adding two blocks.
        </p>
        <div className="mt-4 divide-y divide-[var(--border)]">
          {DISPLAY_ORDER.map((wd) => (
            <div key={wd} className="flex flex-wrap items-start gap-3 py-3">
              <div className="w-24 pt-2 text-sm font-bold">{WEEKDAYS[wd]}</div>
              <div className="flex flex-1 flex-col gap-2">
                {byDay[wd].length === 0 && (
                  <span className="pt-2 text-sm text-[var(--grey)]">Closed</span>
                )}
                {byDay[wd].map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={b.start}
                      onChange={(e) => editBlock(wd, i, "start", e.target.value)}
                      className="fld w-32 py-1.5"
                    />
                    <span className="text-[var(--grey)]">–</span>
                    <input
                      type="time"
                      value={b.end}
                      onChange={(e) => editBlock(wd, i, "end", e.target.value)}
                      className="fld w-32 py-1.5"
                    />
                    <button
                      onClick={() => removeBlock(wd, i)}
                      className="text-sm font-bold text-[var(--rose-dark)]"
                      aria-label="Remove block"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addBlock(wd)}
                  className="self-start text-sm font-bold text-[var(--brand-dark)] hover:text-[var(--brand)]"
                >
                  + Add hours
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} disabled={pending} className="btn btn-primary disabled:opacity-50">
            {pending ? "Saving…" : "Save hours"}
          </button>
          {note && <span className="text-sm text-[var(--grey)]">{note}</span>}
        </div>
      </div>

      {/* Time off */}
      <TimeOffPanel technicianId={technicianId} items={initialTimeOff} />
    </div>
  );
}

function TimeOffPanel({
  technicianId,
  items,
}: {
  technicianId: string;
  items: TimeOffItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const add = () => {
    if (!start || !end) {
      setNote("Pick a start and end.");
      return;
    }
    startTransition(async () => {
      const res = await addTimeOff(
        technicianId,
        new Date(start).toISOString(),
        new Date(end).toISOString(),
        reason,
      );
      setNote(res.message ?? null);
      if (res.ok) {
        setStart("");
        setEnd("");
        setReason("");
      }
      router.refresh();
    });
  };

  const remove = (id: string) =>
    startTransition(async () => {
      await deleteTimeOff(id);
      router.refresh();
    });

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-5">
      <h2 className="text-xl">Time off &amp; holidays</h2>
      <p className="mt-1 text-sm text-[var(--grey)]">
        Blocked periods are removed from online availability automatically.
      </p>

      <div className="mt-4 grid gap-2">
        <label className="text-sm font-bold">From</label>
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="fld py-1.5" />
        <label className="text-sm font-bold">To</label>
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="fld py-1.5" />
        <input
          type="text"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="fld py-1.5"
        />
        <button onClick={add} disabled={pending} className="btn btn-ghost mt-1 disabled:opacity-50">
          + Add time off
        </button>
        {note && <span className="text-sm text-[var(--grey)]">{note}</span>}
      </div>

      <div className="mt-5 divide-y divide-[var(--border)]">
        {items.length === 0 && (
          <p className="py-3 text-sm text-[var(--grey)]">No time off booked.</p>
        )}
        {items.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 py-3">
            <div className="text-sm">
              <div className="font-semibold">
                {fmt(t.startAt)} → {fmt(t.endAt)}
              </div>
              {t.reason && <div className="text-[var(--grey)]">{t.reason}</div>}
            </div>
            <button
              onClick={() => remove(t.id)}
              disabled={pending}
              className="text-sm font-bold text-[var(--rose-dark)] disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
