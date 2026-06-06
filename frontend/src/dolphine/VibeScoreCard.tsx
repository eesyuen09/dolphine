import type { VibeScore } from "./types";

const DIMS: { key: keyof VibeScore; label: string }[] = [
  { key: "food",      label: "Food" },
  { key: "transit",   label: "Transit" },
  { key: "gym",       label: "Gym" },
  { key: "quiet",     label: "Quiet" },
  { key: "lifestyle", label: "Lifestyle" },
];

export function VibeScoreCard({ vibe, title }: { vibe: VibeScore; title?: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/70 backdrop-blur-xl p-5 space-y-3">
      {title && (
        <p className="text-sm font-extrabold text-sea-ink leading-tight">{title}</p>
      )}

      <div className="space-y-2.5">
        {DIMS.map(({ key, label }) => {
          const value = vibe[key] ?? 0;
          const pct = Math.min(Math.max(value, 0), 10) * 10;

          return (
            <div key={key} className="flex items-center gap-2">
              {/* Label */}
              <span className="w-12 font-bold text-slate-500 text-sm shrink-0">
                {label}
              </span>

              {/* Track */}
              <div className="flex-1 h-2.5 rounded-full bg-sea-mist overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sea-teal to-sea-deep transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Value */}
              <span className="w-12 text-right text-sm font-extrabold text-sea-ink shrink-0">
                {value}/10
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
