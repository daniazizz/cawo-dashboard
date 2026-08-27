"use client";

import { useState } from "react";
import type { OtherBalance } from "@/lib/types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export default function OtherBalancesPanel({
  items,
  onAdd,
  onDelete,
}: {
  items: OtherBalance[];
  onAdd: (name: string, amount: number, note: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (name.trim() === "" || !Number.isFinite(parsed)) return;

    setIsSubmitting(true);
    try {
      await onAdd(name.trim(), parsed, note.trim());
      setName("");
      setAmount("");
      setNote("");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-zinc-700">Other Balances</h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          Ad-hoc money owed — positive = owed to CAWO, negative = CAWO owes
        </p>
      </div>

      <div className="divide-y divide-zinc-100">
        {items.length === 0 ? (
          <p className="px-5 py-3 text-sm text-zinc-400">No entries yet</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 px-5 py-3">
              <div>
                <p className="text-sm text-zinc-700">{item.name}</p>
                {item.note && <p className="text-xs text-zinc-400">{item.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                <p
                  className={`text-sm font-medium tabular-nums ${
                    item.amount >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {item.amount >= 0 ? "+" : ""}
                  {currencyFormatter.format(item.amount)}
                </p>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  title="Remove entry"
                  className="text-xs text-zinc-400 hover:text-rose-600 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-zinc-200 px-5 py-3">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Who / what (e.g. Client X invoice)"
            className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="0.01"
            placeholder="+/- amount"
            title="Positive = owed to CAWO, negative = CAWO owes"
            className="w-28 rounded border border-zinc-300 px-2 py-1 text-sm tabular-nums focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSubmitting || name.trim() === "" || amount.trim() === ""}
            className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
