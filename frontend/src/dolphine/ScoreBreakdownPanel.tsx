import type { ScoreBreakdownRow } from "./types";

export function ScoreBreakdownPanel({
  breakdown,
  totalScore,
  roomTitle,
}: {
  breakdown: ScoreBreakdownRow[];
  totalScore: number;
  roomTitle?: string;
}) {
  if (!breakdown || breakdown.length === 0) return null;

  const sorted = [...breakdown].sort((a, b) => b.contribution - a.contribution);
  const maxContribution = Math.max(...sorted.map((r) => r.contribution));

  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-card backdrop-blur-xl">
      {/* Header */}
      <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">
        How this score was computed
      </p>
      <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.04em] text-sea-ink sm:text-3xl">
        {roomTitle ? (
          <>
            How{" "}<span className="text-sea-deep">{roomTitle}</span>{"'s "}
          </>
        ) : (
          <>How this </>
        )}
        <span className="text-coral">{totalScore}</span>{" "}
        score was computed
      </h2>

      {/* Rows */}
      <div className="mt-6 flex flex-col gap-4">
        {sorted.map((row) => {
          const barPct =
            maxContribution > 0
              ? Math.round((row.contribution / maxContribution) * 100)
              : 0;

          return (
            <div key={row.dimension} className="flex flex-col gap-1.5">
              {/* Label + math */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="font-bold text-sea-ink">{row.label}</span>
                <span className="text-xs text-slate-500 font-mono">
                  {row.rawScore}/10
                  {" × "}
                  {Math.round(row.weight * 100)}%
                  {" = "}
                  <span className="font-extrabold text-sea-deep">
                    {row.contribution} pts
                  </span>
                </span>
              </div>

              {/* Bar */}
              <div className="h-3 w-full rounded-full bg-sea-mist overflow-hidden">
                <div
                  className="h-full rounded-full bg-sea-deep/70 transition-all duration-500"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total line */}
      <div className="mt-6 rounded-[1.25rem] bg-sea-foam px-5 py-3 flex items-center justify-between gap-3">
        <p className="text-sm leading-relaxed text-sea-deep">
          Total = sum of dimension contributions
        </p>
        <span className="font-display text-2xl font-extrabold text-sea-deep">
          {totalScore} pts
        </span>
      </div>
    </div>
  );
}
