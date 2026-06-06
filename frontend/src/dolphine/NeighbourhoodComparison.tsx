import type { NeighbourhoodRow } from "./types";

const DIMS: { key: keyof import("./types").DimensionScores; label: string }[] = [
  { key: "commute", label: "Commute" },
  { key: "budget", label: "Budget" },
  { key: "gym", label: "Gym" },
  { key: "food", label: "Food" },
  { key: "quietness", label: "Quiet" },
];

export function NeighbourhoodComparison({ rows }: { rows: NeighbourhoodRow[] }) {
  const top = rows.slice(0, 5);
  if (top.length < 2) return null;

  const minTransport = Math.min(...top.map((r) => r.annualTransportCost));
  const minTrueCost = Math.min(
    ...top.filter((r) => r.trueMonthlyCost != null).map((r) => r.trueMonthlyCost as number)
  );

  return (
    <section className="w-full space-y-6">
      {/* Section header */}
      <div className="space-y-1">
        <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">
          Area comparison
        </p>
        <h2 className="font-display text-3xl font-extrabold text-sea-ink">
          5 areas at a glance
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Compare commute, transport cost, rent, and five lifestyle dimensions side by side — so no single highlight skews your decision.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {top.map((row, idx) => {
          const isFirst = idx === 0;
          const cheapestTransport = row.annualTransportCost === minTransport;
          const cheapestTotal =
            row.trueMonthlyCost != null && row.trueMonthlyCost === minTrueCost;

          return (
            <div
              key={row.id}
              className={[
                "relative flex flex-col gap-4 p-5 rounded-[2rem] border border-white/75",
                "bg-white/80 backdrop-blur-xl shadow-card",
                isFirst ? "ring-2 ring-coral" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {/* Rank badge + name */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={[
                    "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold shrink-0",
                    isFirst
                      ? "bg-sea-deep text-white"
                      : "bg-sea-mist text-slate-500",
                  ].join(" ")}
                >
                  #{idx + 1}
                </span>
                <span className="font-extrabold text-lg text-sea-ink leading-tight">
                  {row.name}
                </span>
                {isFirst && (
                  <span className="ml-auto text-xs font-extrabold bg-coral/10 text-coral px-2 py-0.5 rounded-full whitespace-nowrap">
                    🏆 Best
                  </span>
                )}
              </div>

              {/* Big score + progress bar */}
              <div className="space-y-1.5">
                <p className="font-display text-4xl font-extrabold text-sea-deep leading-none">
                  {row.score.toFixed(1)}
                </p>
                <div className="h-1.5 w-full rounded-full bg-sea-mist overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sea-teal transition-all"
                    style={{ width: `${Math.min(row.score, 100)}%` }}
                  />
                </div>
              </div>

              {/* Stat rows */}
              <div className="space-y-1.5 text-sm">
                <StatRow
                  label="Annual commute"
                  value={`${row.annualCommuteHours} hrs`}
                />
                <StatRow
                  label="Annual transport"
                  value={`S$${row.annualTransportCost}`}
                  highlight={cheapestTransport}
                />
                <StatRow
                  label="Rent"
                  value={row.rent != null ? `S$${row.rent}` : "—"}
                />
                <StatRow
                  label="True monthly cost"
                  value={
                    row.trueMonthlyCost != null
                      ? `S$${Math.round(row.trueMonthlyCost)}`
                      : "—"
                  }
                  highlight={cheapestTotal}
                />
              </div>

              {/* Mini 5-dim bar chart */}
              <div className="space-y-1.5">
                {DIMS.map(({ key, label }) => {
                  const val = row.dimensionScores[key] ?? 0;
                  return (
                    <div key={key} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-sea-ink/60">
                        <span>{label}</span>
                        <span>{val.toFixed(1)}</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-sea-foam overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sea-deep/70 transition-all"
                          style={{ width: `${Math.min(val * 10, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-sea-ink/50 shrink-0">{label}</span>
      <span
        className={
          highlight
            ? "text-emerald-600 font-bold tabular-nums"
            : "text-sea-ink font-semibold tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
