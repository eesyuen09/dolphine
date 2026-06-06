import type { BiasWarning } from "./types";

const severityConfig = {
  high: {
    pill: "bg-coral/15 text-coral",
    label: "High risk",
    accent: "border-l-4 border-coral",
  },
  medium: {
    pill: "bg-amber-100 text-amber-700",
    label: "Medium",
    accent: "border-l-4 border-amber-400",
  },
  low: {
    pill: "bg-sea-foam text-sea-teal",
    label: "Note",
    accent: "border-l-4 border-sea-teal",
  },
};

export function BiasWarningsPanel({ warnings }: { warnings: BiasWarning[] }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <section className="w-full space-y-6">
      {/* Section header */}
      <div className="space-y-2">
        <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">
          Decision checks
        </p>
        <h2 className="font-display text-3xl font-extrabold text-sea-ink leading-tight">
          Dolphine caught your decision blind spots
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          These are not deal-breakers — they flag trade-offs that are easily hidden by rent price, photos, or a single standout feature.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {warnings.map((warning, index) => {
          const config = severityConfig[warning.severity];
          return (
            <div
              key={`${warning.type}-${index}`}
              className={`rounded-[1.75rem] border border-white/75 bg-white/80 p-6 shadow-card backdrop-blur ${config.accent} flex flex-col gap-3`}
            >
              {/* Icon + severity row */}
              <div className="flex items-start justify-between gap-3">
                <span className="text-3xl leading-none" role="img" aria-hidden="true">
                  {warning.icon}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${config.pill}`}
                >
                  {config.label}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-display text-base font-extrabold text-sea-deep leading-snug">
                {warning.title}
              </h3>

              {/* Message */}
              <p className="text-sm leading-relaxed text-slate-600">
                {warning.message}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
