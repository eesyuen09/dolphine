import type { CorrectnessData } from "./types";

const statusConfig = {
  passed: {
    badge: "bg-emerald-50 text-emerald-700",
    icon: "✓",
    label: "Verified",
  },
  warning: {
    badge: "bg-amber-100 text-amber-800",
    icon: "!",
    label: "Needs attention",
  },
  failed: {
    badge: "bg-coral/15 text-coral",
    icon: "×",
    label: "Failed",
  },
};

export function CorrectnessPanel({ correctness }: { correctness?: CorrectnessData }) {
  if (!correctness) return null;

  const coverage = correctness.dataCoverage;

  return (
    <section className="rounded-[2.5rem] border border-white/75 bg-white/78 p-7 shadow-soft backdrop-blur-xl sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">
            Data checks
          </p>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.04em] text-sea-ink">
            What evidence backs this recommendation
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-sea-deep">
            Review data coverage, missing fields, and model output before drawing conclusions from the final rankings.
          </p>
          <p className="mt-5 text-sm leading-7 text-slate-600">{correctness.summary}</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Metric label="Rooms checked" value={coverage.roomsCompared} />
            <Metric label="Areas checked" value={coverage.neighbourhoodsCompared} />
            <Metric label="Avg data confidence" value={`${coverage.averageRoomConfidence}%`} />
            <Metric label="Model used" value={correctness.model} />
          </div>
        </div>

        <div className="grid gap-3">
          {correctness.checks.map((check) => {
            const config = statusConfig[check.status];
            return (
              <article className="rounded-[1.5rem] border border-sea-deep/5 bg-white/82 p-5 shadow-card" key={check.label}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-sea-ink">{check.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{check.detail}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ${config.badge}`}>
                    {config.icon} {config.label}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-sea-mist px-4 py-3">
      <span className="block text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <strong className="mt-1 block text-sea-ink">{value}</strong>
    </div>
  );
}
