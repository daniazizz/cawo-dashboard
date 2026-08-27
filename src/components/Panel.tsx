import type { ReactNode } from "react";

export function Panel({
  title,
  warning,
  children,
}: {
  title: string;
  warning?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
        {warning && (
          <p className="mt-0.5 text-xs text-amber-600" title={warning}>
            ⚠ last sync failed — showing last known data
          </p>
        )}
      </div>
      <div className="divide-y divide-zinc-100">{children}</div>
    </div>
  );
}

export function Row({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div>
        <p className="text-sm text-zinc-700">{label}</p>
        {sublabel && <p className="text-xs text-zinc-400">{sublabel}</p>}
      </div>
      <p className="text-sm font-medium tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}
