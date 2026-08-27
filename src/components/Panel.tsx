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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 shadow-sm">
      <div className="border-b border-zinc-800 px-5 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {warning && (
          <p className="mt-0.5 text-xs text-amber-400" title={warning}>
            ⚠ last sync failed — showing last known data
          </p>
        )}
      </div>
      <div className="divide-y divide-zinc-800">{children}</div>
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
        <p className="text-sm text-zinc-300">{label}</p>
        {sublabel && <p className="text-xs text-zinc-500">{sublabel}</p>}
      </div>
      <p className="text-sm font-medium tabular-nums text-zinc-50">{value}</p>
    </div>
  );
}
