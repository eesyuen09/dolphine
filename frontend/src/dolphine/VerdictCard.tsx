import type { TradeoffData } from "./types";

export function VerdictCard({
  winner,
  tradeoffs,
  onViewAnalysis,
  onGenerateMessage,
}: {
  winner: {
    title: string;
    area: string;
    rent: number;
    totalMonthlyCost?: number;
    whyHigh?: string[];
    shortReason?: string;
    image?: string;
  } | null;
  tradeoffs: TradeoffData | null;
  onViewAnalysis: () => void;
  onGenerateMessage: () => void;
}) {
  if (!winner) return null;

  // Derive up to 3 bullet reasons: prefer whyHigh array, fall back to shortReason
  const bullets: string[] =
    winner.whyHigh && winner.whyHigh.length > 0
      ? winner.whyHigh.slice(0, 3)
      : winner.shortReason
      ? [winner.shortReason]
      : [];

  // Show amber warning only when the gap between rent difference and true-cost difference is meaningful (>= S$30)
  const showWarning =
    tradeoffs != null &&
    tradeoffs.rentDifference != null &&
    tradeoffs.trueCostDifference != null &&
    Math.abs(Math.abs(tradeoffs.rentDifference) - Math.abs(tradeoffs.trueCostDifference)) >= 30;

  return (
    <div
      className={[
        "w-full rounded-[2.5rem] border border-white/75",
        "bg-gradient-to-br from-white/90 to-sea-foam/60",
        "p-8 sm:p-10 shadow-soft backdrop-blur-xl",
        "ring-1 ring-coral",
      ].join(" ")}
    >
      <div className="flex flex-col md:flex-row md:items-start gap-8">
        {/* Left: main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Eyebrow */}
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">
            🐬 DOLPHINE'S VERDICT
          </p>

          {/* Big title + subtitle */}
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-extrabold text-sea-ink leading-tight break-words">
              {winner.title}
            </h1>
            <p className="text-lg font-semibold text-sea-deep/80">
              is your best choice among these listings
            </p>
          </div>

          {/* Reason bullets */}
          {bullets.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-extrabold text-sea-ink/70 uppercase tracking-wide">
                Why (30-second version):
              </p>
              <ul className="space-y-2">
                {bullets.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sea-deep text-white text-[10px] font-extrabold">
                      {i + 1}
                    </span>
                    <span className="text-base leading-relaxed text-slate-700">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Amber warning: rent vs true-cost gap */}
          {showWarning && tradeoffs && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4">
              <span className="shrink-0 text-lg">⚠️</span>
              <p className="text-sm font-semibold text-amber-800 leading-relaxed">
                <span className="font-extrabold">{tradeoffs.runnerUpName}</span>{" "}
                looks cheaper by{" "}
                <span className="font-extrabold">
                  S${Math.abs(tradeoffs.rentDifference)}
                </span>
                , but the true monthly cost gap is only{" "}
                <span className="font-extrabold">
                  S${Math.abs(tradeoffs.trueCostDifference)}
                </span>
              </p>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={onViewAnalysis}
              className={[
                "inline-flex items-center gap-2 rounded-full px-6 py-3",
                "bg-sea-deep text-white text-sm font-extrabold",
                "shadow-md hover:brightness-110 active:scale-95 transition-all",
              ].join(" ")}
            >
              View Full Analysis ↓
            </button>
            <button
              type="button"
              onClick={onGenerateMessage}
              className={[
                "inline-flex items-center gap-2 rounded-full px-6 py-3",
                "border-2 border-coral text-coral text-sm font-extrabold bg-transparent",
                "hover:bg-coral/10 active:scale-95 transition-all",
              ].join(" ")}
            >
              Generate Landlord Message
            </button>
          </div>
        </div>

        {/* Right: optional thumbnail (md+) */}
        {winner.image && (
          <div className="hidden md:flex shrink-0 items-start">
            <img
              src={winner.image}
              alt={winner.title}
              className="h-52 w-52 rounded-[2rem] object-cover shadow-card border border-white/75"
            />
          </div>
        )}
      </div>
    </div>
  );
}
