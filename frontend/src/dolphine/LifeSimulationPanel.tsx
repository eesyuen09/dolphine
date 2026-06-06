import type { LifeSim } from "./types";

export function LifeSimulationPanel({ sim }: { sim: LifeSim | null }) {
  if (!sim) return null;

  const annualHoursSaved = sim.annualHoursSaved;
  const savedPositive = annualHoursSaved >= 0;
  const absHours = Math.abs(annualHoursSaved);

  const gymLabel = sim.gymDays.length > 0 ? sim.gymDays.join(", ") : "—";

  return (
    <section className="rounded-[2rem] border border-white/75 bg-white/76 p-6 shadow-soft backdrop-blur-xl">
      {/* Section header */}
      <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal mb-1">
        Your future weekday
      </p>
      <h2 className="font-display text-2xl font-extrabold text-sea-ink mb-4">
        Your day after moving in
      </h2>

      {/* Narrative lead */}
      {sim.narrative && (
        <p className="italic text-sea-deep mb-6 leading-relaxed">
          {sim.narrative}
        </p>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {/* Departure time */}
        <div className="rounded-2xl bg-sea-mist px-4 py-3">
          <p className="text-xs font-semibold text-sea-deep uppercase tracking-wide mb-1">
            Departure
          </p>
          <p className="font-display text-xl font-extrabold text-sea-ink">
            {sim.departureTime}
          </p>
        </div>

        {/* Annual hours saved / spent */}
        <div className="rounded-2xl bg-sea-mist px-4 py-3">
          <p className="text-xs font-semibold text-sea-deep uppercase tracking-wide mb-1">
            {savedPositive ? "Annual commute saved" : "Extra per year"}
          </p>
          <p
            className={`font-display text-xl font-extrabold ${
              savedPositive ? "text-sea-ink" : "text-coral"
            }`}
          >
            {absHours} hrs
          </p>
        </div>

        {/* Gym days */}
        <div className="rounded-2xl bg-sea-mist px-4 py-3">
          <p className="text-xs font-semibold text-sea-deep uppercase tracking-wide mb-1">
            Gym days
          </p>
          <p className="font-display text-xl font-extrabold text-sea-ink">
            {gymLabel}
          </p>
        </div>
      </div>

      {/* Winner timeline */}
      {sim.winnerTimeline.length > 0 && (
        <div className="mb-4">
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-sea-teal/30" />
            <ul className="space-y-4">
              {sim.winnerTimeline.map((item, i) => (
                <li key={i} className="relative flex items-start gap-3">
                  <span className="absolute left-[-15px] top-1 h-3 w-3 rounded-full bg-sea-teal flex-shrink-0" />
                  <p className="text-sea-ink text-sm leading-snug">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Runner-up timeline (muted) */}
      {sim.runnerUpTimeline.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/75">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            vs. runner-up
          </p>
          <div className="relative pl-6">
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-300/50" />
            <ul className="space-y-3">
              {sim.runnerUpTimeline.map((item, i) => (
                <li key={i} className="relative flex items-start gap-3">
                  <span className="absolute left-[-15px] top-1 h-2.5 w-2.5 rounded-full bg-slate-300 flex-shrink-0" />
                  <p className="text-slate-400 text-sm leading-snug">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
