"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import CapitalEvolutionChart from "@/components/CapitalEvolutionChart";
import InventoryPanel from "@/components/InventoryPanel";
import MetricCard from "@/components/MetricCard";
import OtherBalancesPanel from "@/components/OtherBalancesPanel";
import { Panel, Row } from "@/components/Panel";
import RefreshButton from "@/components/RefreshButton";
import type { OverviewResponse } from "@/lib/types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatCurrency(amount: number, currency?: string) {
  if (currency && currency !== "EUR") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return currencyFormatter.format(amount);
}

const SOURCE_LABELS: Record<string, string> = {
  wise: "Wise",
  shopify_payout: "Shopify (pending payout)",
};

function sourceLabel(source: string) {
  return SOURCE_LABELS[source] ?? source;
}

interface HistoryPoint {
  date: string;
  cash: number;
  inventory: number;
  liabilities: number;
  otherBalances: number;
  netPosition: number;
}

export default function Home() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [overviewResponse, historyResponse] = await Promise.all([
        fetch("/api/overview"),
        fetch("/api/history"),
      ]);
      if (!overviewResponse.ok) {
        throw new Error(`Request failed with status ${overviewResponse.status}`);
      }
      const json: OverviewResponse = await overviewResponse.json();
      setData(json);
      if (historyResponse.ok) {
        const historyJson: { points: HistoryPoint[] } = await historyResponse.json();
        setHistory(historyJson.points);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load dashboard data",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount: standard pattern for client components without a data-fetching framework.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOverview();
  }, [loadOverview]);

  const handleSaveCost = useCallback(
    async (productTitle: string, unitCost: number) => {
      const response = await fetch("/api/inventory-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productTitle, unitCost }),
      });
      if (!response.ok) {
        throw new Error(`Failed to save cost (status ${response.status})`);
      }
      await loadOverview();
    },
    [loadOverview],
  );

  const handleAddOtherBalance = useCallback(
    async (name: string, amount: number, note: string) => {
      const response = await fetch("/api/other-balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount, note: note || null }),
      });
      if (!response.ok) {
        throw new Error(`Failed to add entry (status ${response.status})`);
      }
      await loadOverview();
    },
    [loadOverview],
  );

  const handleDeleteOtherBalance = useCallback(
    async (id: string) => {
      const response = await fetch("/api/other-balances", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error(`Failed to delete entry (status ${response.status})`);
      }
      await loadOverview();
    },
    [loadOverview],
  );

  // Each source can fail independently — surface the failure next to the metric it affects,
  // rather than blocking the whole dashboard, so a working source is still visible.
  const findError = (keyword: string) =>
    data?.errors?.find((e) => e.toLowerCase().includes(keyword));
  const wiseError = findError("wise");
  const payoutError = findError("payout");
  const shopifyError = data?.errors?.find(
    (e) => e.toLowerCase().includes("shopify") && !e.toLowerCase().includes("payout"),
  );
  const sheetsError = findError("sheets");
  const cashError = wiseError ?? payoutError;

  // Liquid current state — excludes inventory, which is slow-moving and not immediately spendable.
  const currentPosition = data
    ? data.totals.totalCash + data.totals.totalOtherBalances - data.totals.totalLiabilities
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/cawo-logo.svg" alt="CAWO" width={76} height={18} />
            <div className="h-6 w-px bg-zinc-800" />
            <div>
              <h1 className="text-xl font-semibold text-zinc-50">
                Finance Dashboard
              </h1>
              {data && (
                <p className="mt-1 text-xs text-zinc-500">
                  Last updated {new Date(data.generatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <RefreshButton onRefresh={loadOverview} />
        </header>

        {errorMessage && (
          <div className="mb-6 rounded-md border border-rose-900 bg-rose-950 px-4 py-3 text-sm text-rose-300">
            {errorMessage}
          </div>
        )}

        {isLoading && !data ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : data ? (
          <>
            <div className="mb-8">
              <MetricCard
                label="Current Position"
                value={formatCurrency(currentPosition)}
                hint="Cash + Other Balances − Liabilities (excludes slow-moving inventory)"
                tone={currentPosition >= 0 ? "positive" : "negative"}
              />
            </div>

            <div className="mb-8">
              <CapitalEvolutionChart points={history} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel title="Cash Balances" warning={cashError}>
                {data.cash.length === 0 ? (
                  <p className="px-5 py-3 text-sm text-zinc-400">
                    No cash data yet
                  </p>
                ) : (
                  data.cash.map((c) => (
                    <Row
                      key={`${c.source}-${c.currency}`}
                      label={`${sourceLabel(c.source)} (${c.currency})`}
                      value={formatCurrency(c.amount, c.currency)}
                    />
                  ))
                )}
              </Panel>

              <Panel title="Liabilities" warning={sheetsError}>
                {data.liabilities.length === 0 ? (
                  <p className="px-5 py-3 text-sm text-zinc-400">
                    No liabilities recorded
                  </p>
                ) : (
                  data.liabilities.map((l) => (
                    <Row
                      key={l.name}
                      label={l.name}
                      sublabel={l.source}
                      value={formatCurrency(l.amount)}
                    />
                  ))
                )}
              </Panel>

              <OtherBalancesPanel
                items={data.otherBalances}
                onAdd={handleAddOtherBalance}
                onDelete={handleDeleteOtherBalance}
              />

              <InventoryPanel
                items={data.inventory}
                warning={shopifyError}
                onSaveCost={handleSaveCost}
              />

              <Panel title="Recurring Costs">
                {data.recurringCosts.length === 0 ? (
                  <p className="px-5 py-3 text-sm text-zinc-400">
                    No recurring costs configured
                  </p>
                ) : (
                  data.recurringCosts
                    .filter((c) => c.active)
                    .map((c) => (
                      <Row
                        key={c.id}
                        label={c.name}
                        sublabel={`${c.category} · ${c.frequency}`}
                        value={formatCurrency(c.amount)}
                      />
                    ))
                )}
              </Panel>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
