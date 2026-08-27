"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface HistoryPoint {
  date: string;
  cash: number;
  inventory: number;
  liabilities: number;
  otherBalances: number;
  netPosition: number;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CapitalEvolutionChart({ points }: { points: HistoryPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-200">Net Position Evolution</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Not enough history yet — snapshots accumulate each time the dashboard syncs.
        </p>
      </div>
    );
  }

  // Liabilities are plotted as a negative bar segment so the stack visually subtracts
  // from the other components, matching how netPosition is actually calculated.
  const chartData = points.map((p) => ({
    ...p,
    liabilitiesNegative: -p.liabilities,
  }));

  const latest = points[points.length - 1];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Net Position Evolution</h2>
          <p className="text-xs text-zinc-500">Daily snapshot history · EUR</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Latest Net Position</p>
          <p className="text-lg font-semibold tabular-nums text-zinc-50">
            {currencyFormatter.format(latest.netPosition)}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#a1a1aa" }} tickMargin={8} />
          <YAxis
            tick={{ fontSize: 12, fill: "#a1a1aa" }}
            tickFormatter={formatCompact}
            width={70}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46" }}
            labelStyle={{ color: "#e4e4e7" }}
            itemStyle={{ color: "#e4e4e7" }}
            formatter={(value) =>
              currencyFormatter.format(typeof value === "number" ? value : Number(value))
            }
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
          <Bar dataKey="cash" name="Cash" stackId="composition" fill="#f97316" />
          <Bar dataKey="inventory" name="Inventory" stackId="composition" fill="#22c55e" />
          <Bar dataKey="otherBalances" name="Other Balances" stackId="composition" fill="#eab308" />
          <Bar dataKey="liabilitiesNegative" name="Liabilities" stackId="composition" fill="#a78bfa" />
          <Line
            type="monotone"
            dataKey="netPosition"
            name="Net Position"
            stroke="#f4f4f5"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCell label="Cash" value={latest.cash} />
        <SummaryCell label="Inventory" value={latest.inventory} />
        <SummaryCell label="Other" value={latest.otherBalances} />
        <SummaryCell label="Liabilities" value={latest.liabilities} />
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-zinc-800 px-3 py-2 text-center">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium tabular-nums text-zinc-50">
        {currencyFormatter.format(value)}
      </p>
    </div>
  );
}
