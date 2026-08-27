interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative";
  warning?: string;
}

const toneClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-zinc-50",
  positive: "text-emerald-400",
  negative: "text-rose-400",
};

export default function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  warning,
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${toneClasses[tone]}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      {warning && (
        <p className="mt-1 text-xs text-amber-400" title={warning}>
          ⚠ sync failed — showing last known data
        </p>
      )}
    </div>
  );
}
