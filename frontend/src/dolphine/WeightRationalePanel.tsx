import type { WeightRationaleRow } from "./types";

export function WeightRationalePanel({ rationale }: { rationale: WeightRationaleRow[] }) {
  if (!rationale || rationale.length === 0) return null;

  const sorted = [...rationale].sort((a, b) => b.weight - a.weight);
  const topDimension = sorted[0]?.dimension;

  return (
    <section className="w-full space-y-6">
      {/* Section header */}
      <div className="space-y-2">
        <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">
          Weight rationale
        </p>
        <h2 className="font-display text-3xl font-extrabold text-sea-ink leading-tight">
          Why I weighted it this way
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Your preferences are translated into scoring weights here, so you can see exactly how the rankings shift.
        </p>
      </div>

      {/* Card */}
      <div className="rounded-[2rem] border border-white/75 bg-white/76 p-6 shadow-soft backdrop-blur-xl divide-y divide-sea-deep/5">
        {sorted.map((row) => {
          const isTop = row.dimension === topDimension;
          const pctLabel = Math.round(row.weight * 100) + "%";

          return (
            <div key={row.dimension} className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
              {/* Label + weight pill row */}
              <div className="flex items-center gap-3">
                <span className="font-bold text-sea-ink">{row.label}</span>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-extrabold ${
                    isTop
                      ? "bg-coral/15 text-coral"
                      : "bg-sea-foam text-sea-teal"
                  }`}
                >
                  {pctLabel}
                </span>
              </div>
              {/* Reason */}
              <p className="text-sm leading-relaxed text-slate-600">{row.reason}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
