"use client";

import { useState } from "react";
import type { InventoryItem } from "@/lib/types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function groupByProduct(
  items: InventoryItem[],
): Array<[string, InventoryItem[]]> {
  const groups = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const variants = groups.get(item.productTitle) ?? [];
    variants.push(item);
    groups.set(item.productTitle, variants);
  }
  return Array.from(groups.entries());
}

function CostInput({
  productTitle,
  unitCost,
  onSave,
}: {
  productTitle: string;
  unitCost: number | null;
  onSave: (productTitle: string, unitCost: number) => Promise<void>;
}) {
  const [value, setValue] = useState(unitCost !== null ? String(unitCost) : "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed === unitCost) return;
    setIsSaving(true);
    try {
      await onSave(productTitle, parsed);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-zinc-400" htmlFor={`cost-${productTitle}`}>
        Unit cost (EUR)
      </label>
      <input
        id={`cost-${productTitle}`}
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        onBlur={handleSave}
        disabled={isSaving}
        placeholder="0.00"
        title="Cost per unit, applied to every variant of this product"
        className="w-20 rounded border border-zinc-300 px-2 py-1 text-right text-xs tabular-nums focus:border-zinc-500 focus:outline-none disabled:bg-zinc-100"
      />
    </div>
  );
}

export default function InventoryPanel({
  items,
  warning,
  onSaveCost,
}: {
  items: InventoryItem[];
  warning?: string;
  onSaveCost: (productTitle: string, unitCost: number) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const groups = groupByProduct(items);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between border-b border-zinc-200 px-5 py-3 text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-zinc-700">Inventory</h2>
          {warning && (
            <p className="mt-0.5 text-xs text-amber-600" title={warning}>
              ⚠ last sync failed — showing last known data
            </p>
          )}
        </div>
        <span className="text-xs text-zinc-400">{isOpen ? "Hide ▲" : "Show ▼"}</span>
      </button>
      {isOpen && (
      <div className="divide-y divide-zinc-100">
        {groups.length === 0 ? (
          <p className="px-5 py-3 text-sm text-zinc-400">
            No inventory data yet
          </p>
        ) : (
          groups.map(([productTitle, variants]) => {
            const totalQuantity = variants.reduce(
              (sum, v) => sum + v.quantity,
              0,
            );
            const unitCost = variants[0].unitCost;
            const totalValue = totalQuantity * (unitCost ?? 0);

            return (
              <div key={productTitle} className="px-5 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">
                      {productTitle}
                    </p>
                    <p className="text-xs text-zinc-400">
                      qty {totalQuantity} · {variants.length} variant
                      {variants.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-sm font-medium tabular-nums text-zinc-900">
                      {unitCost !== null
                        ? currencyFormatter.format(totalValue)
                        : "—"}
                    </p>
                    <CostInput
                      productTitle={productTitle}
                      unitCost={unitCost}
                      onSave={onSaveCost}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}
    </div>
  );
}
