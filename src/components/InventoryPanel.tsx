"use client";

import { useState } from "react";
import type { InventoryItem } from "@/lib/types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function groupByProduct(items: InventoryItem[]): Array<[string, InventoryItem[]]> {
  const groups = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const variants = groups.get(item.productTitle) ?? [];
    variants.push(item);
    groups.set(item.productTitle, variants);
  }
  return Array.from(groups.entries());
}

function CostInput({
  sku,
  unitCost,
  onSave,
}: {
  sku: string;
  unitCost: number | null;
  onSave: (sku: string, unitCost: number) => Promise<void>;
}) {
  const [value, setValue] = useState(unitCost !== null ? String(unitCost) : "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleBlur() {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed === unitCost) return;
    setIsSaving(true);
    try {
      await onSave(sku, parsed);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <input
      type="number"
      min="0"
      step="0.01"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      disabled={isSaving}
      placeholder="Set cost"
      title="Unit cost (COGS), saved on blur"
      className="w-20 rounded border border-zinc-200 px-2 py-1 text-right text-xs tabular-nums disabled:bg-zinc-100"
    />
  );
}

export default function InventoryPanel({
  items,
  warning,
  onSaveCost,
}: {
  items: InventoryItem[];
  warning?: string;
  onSaveCost: (sku: string, unitCost: number) => Promise<void>;
}) {
  const groups = groupByProduct(items);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-zinc-700">Inventory</h2>
        {warning && (
          <p className="mt-0.5 text-xs text-amber-600" title={warning}>
            ⚠ last sync failed — showing last known data
          </p>
        )}
      </div>
      <div className="divide-y divide-zinc-100">
        {groups.length === 0 ? (
          <p className="px-5 py-3 text-sm text-zinc-400">No inventory data yet</p>
        ) : (
          groups.map(([productTitle, variants]) => {
            const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);
            const hasMissingCost = variants.some((v) => v.unitCost === null);
            const totalValue = variants.reduce((sum, v) => sum + v.quantity * (v.unitCost ?? 0), 0);

            return (
              <div key={productTitle} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-800">{productTitle}</p>
                  <p className="text-sm font-medium tabular-nums text-zinc-900">
                    {hasMissingCost ? "—" : currencyFormatter.format(totalValue)}
                  </p>
                </div>
                <p className="text-xs text-zinc-400">
                  qty {totalQuantity} across {variants.length} variant{variants.length === 1 ? "" : "s"}
                </p>
                <div className="mt-2 space-y-1.5">
                  {variants.map((variant) => (
                    <div
                      key={variant.sku}
                      className="flex items-center justify-between gap-2 text-xs text-zinc-600"
                    >
                      <span>
                        SKU {variant.sku} · qty {variant.quantity}
                      </span>
                      <CostInput sku={variant.sku} unitCost={variant.unitCost} onSave={onSaveCost} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
