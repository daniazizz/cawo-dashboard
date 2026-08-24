interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative";
  warning?: string;
}

const toneClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-zinc-900",
  positive: "text-emerald-600",
  negative: "text-rose-600",
};

export default function MetricCard({ label, value, hint, tone = "default", warning }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
      {warning && (
        <p className="mt-1 text-xs text-amber-600" title={warning}>
          ⚠ sync failed — showing last known data
        </p>
      )}
    </div>
  );
}
