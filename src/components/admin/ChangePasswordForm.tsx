"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/lib/admin/actions";

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [note, setNote] = useState<{ ok: boolean; msg: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setNote({ ok: false, msg: "New passwords don't match." });
      return;
    }
    startTransition(async () => {
      const res = await changePassword(current, next);
      setNote({ ok: res.ok, msg: res.message ?? "" });
      if (res.ok) {
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    });
  };

  return (
    <form onSubmit={submit} className="mt-6 max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-6">
      <h2 className="text-xl">Change password</h2>
      <div className="mt-4 grid gap-4">
        <Field label="Current password" value={current} onChange={setCurrent} />
        <Field label="New password" value={next} onChange={setNext} hint="At least 6 characters" />
        <Field label="Confirm new password" value={confirm} onChange={setConfirm} />
      </div>
      {note && (
        <p
          className="mt-3 text-sm font-semibold"
          style={{ color: note.ok ? "#1c7a43" : "var(--rose-dark)" }}
        >
          {note.msg}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary mt-5 disabled:opacity-50">
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      {hint && <span className="mb-1 block text-xs text-[var(--grey)]">{hint}</span>}
      <input
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="fld"
        required
      />
    </label>
  );
}
