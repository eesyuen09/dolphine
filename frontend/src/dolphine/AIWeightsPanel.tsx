import type { WeightVector } from "./types";

const LABELS: Record<keyof WeightVector, string> = {
  commute: "Commute",
  budget: "Budget",
  gym: "Gym",
  food: "Food",
  quietness: "Quiet",
};

export function AIWeightsPanel({ weights }: { weights: WeightVector }) {
  const keys = (Object.keys(weights) as (keyof WeightVector)[]).sort(
    (a, b) => weights[b] - weights[a]
  );

  const maxWeight = Math.max(...keys.map((k) => weights[k]));
  const topLabel = LABELS[keys[0]];
  const secondLabel = LABELS[keys[1]];

  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/76 p-5 shadow-card backdrop-blur-xl">
      <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">
        Weights
      </p>
      <h2 className="mt-2 font-display text-xl font-extrabold tracking-[-0.04em] text-sea-ink">
        How Dolphine read your priorities
      </h2>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
        Weights determine which dimension pulls the score furthest within the same 10-point scale.
      </p>

      <div className="mt-4 grid gap-2">
        {keys.slice(0, 3).map((key) => {
          const fillPct = Math.round((weights[key] / maxWeight) * 100) + "%";
          const pctLabel = Math.round(weights[key] * 100) + "%";
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-14 text-sm font-bold text-sea-ink">{LABELS[key]}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sea-mist">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sea-teal to-sea-deep transition-all duration-500"
                  style={{ width: fillPct }}
                />
              </div>
              <span className="w-10 text-right text-xs font-extrabold text-sea-deep">
                {pctLabel}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs font-bold leading-6 text-slate-500">
        You care most about <span className="text-sea-deep">{topLabel}</span>, then{" "}
        <span className="text-sea-deep">{secondLabel}</span>.
      </p>
    </div>
  );
}
