import type { NeighbourhoodRow } from "./types";

export function TotalLifeCostMatrix({ rows, selectedArea }: { rows: NeighbourhoodRow[]; selectedArea?: string }) {
  const top = rows.slice(0, 3);
  if (top.length < 2) return null;

  // Find cheapest-by-totalMonthlyCost column index
  const minTotalIdx = top.reduce(
    (bestIdx, row, idx) =>
      row.totalMonthlyCost < top[bestIdx].totalMonthlyCost ? idx : bestIdx,
    0,
  );

  return (
    <section className="w-full space-y-6">
      {/* Section header */}
      <div className="space-y-2">
        <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-sea-teal">
          Monthly cost
        </p>
        <h2 className="font-display text-3xl font-extrabold text-sea-ink leading-tight">
          True total cost (not just rent)
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Transport costs and commute time are folded into the monthly figure so a cheaper listing never hides its real daily price tag.
        </p>
      </div>

      {/* Matrix card */}
      <div className="rounded-[2rem] border border-white/75 bg-white/80 backdrop-blur-xl shadow-card overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr>
              {/* Row-label column */}
              <th className="w-36 px-6 py-5 text-left" />
              {top.map((row, idx) => (
                <th
                  key={row.id}
                  className={[
                    "px-4 py-5 text-center align-top",
                    idx === minTotalIdx
                      ? "ring-2 ring-inset ring-emerald-400 rounded-t-2xl"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    {idx === minTotalIdx && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600 whitespace-nowrap">
                        Cheapest all-in
                      </span>
                    )}
                    <span className="font-extrabold text-base text-sea-ink leading-snug text-center">
                      {row.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Rent */}
            <tr className="border-t border-sea-mist/60">
              <td className="px-6 py-3.5 text-sm font-semibold text-sea-ink/60 whitespace-nowrap">
                Rent
              </td>
              {top.map((row) => (
                <td
                  key={row.id}
                  className="px-4 py-3.5 text-center text-sm font-semibold text-sea-ink tabular-nums"
                >
                  {row.rent != null ? `S$${row.rent.toLocaleString()}` : "—"}
                </td>
              ))}
            </tr>

            {/* Transport */}
            <tr className="border-t border-sea-mist/60">
              <td className="px-6 py-3.5 text-sm font-semibold text-sea-ink/60 whitespace-nowrap">
                Transport
              </td>
              {top.map((row) => (
                <td
                  key={row.id}
                  className="px-4 py-3.5 text-center text-sm font-semibold text-sea-ink tabular-nums"
                >
                  +S${row.monthlyTransport.toLocaleString()}
                </td>
              ))}
            </tr>

            {/* Time tax */}
            <tr className="border-t border-sea-mist/60">
              <td className="px-6 py-3.5 text-sm font-semibold text-sea-ink/60 whitespace-nowrap">
                Time tax&nbsp;*
              </td>
              {top.map((row) => (
                <td
                  key={row.id}
                  className="px-4 py-3.5 text-center text-sm font-semibold text-sea-ink tabular-nums"
                >
                  +S${row.timeTax.toLocaleString()}
                </td>
              ))}
            </tr>

            {/* Divider row */}
            <tr>
              <td colSpan={top.length + 1} className="px-6 pt-1 pb-0">
                <div className="border-t-2 border-sea-ink/10" />
              </td>
            </tr>

            {/* True monthly cost */}
            <tr className="border-t-2 border-sea-teal/30 bg-sea-mist/30">
              <td className="px-6 py-4 text-sm font-extrabold text-sea-deep whitespace-nowrap">
                True monthly cost
              </td>
              {top.map((row, idx) => (
                <td
                  key={row.id}
                  className={[
                    "px-4 py-4 text-center tabular-nums",
                    idx === minTotalIdx
                      ? "text-emerald-600 font-extrabold text-xl"
                      : "text-sea-deep font-extrabold text-xl",
                  ].join(" ")}
                >
                  S${row.totalMonthlyCost.toLocaleString()}
                </td>
              ))}
            </tr>

            {/* Difference vs rent */}
            <tr className="border-t border-sea-mist/60 bg-sea-mist/20">
              <td className="px-6 py-3.5 text-sm font-semibold text-sea-ink/60 whitespace-nowrap">
                vs rent
              </td>
              {top.map((row, idx) => {
                const delta = row.totalMonthlyCost - (row.rent ?? row.totalMonthlyCost);
                return (
                  <td
                    key={row.id}
                    className="px-4 py-3.5 text-center text-sm tabular-nums"
                  >
                    <span className={delta > 0 ? "text-coral font-bold" : "text-emerald-600 font-bold"}>
                      {delta >= 0 ? "+" : ""}S${delta.toLocaleString()}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        {/* Footnote */}
        <div className="px-6 py-4 border-t border-sea-mist/60">
          <p className="text-xs text-sea-ink/50 leading-relaxed">
            * Area-level estimates used to illustrate cost differences; final rankings also factor in listing quality and preference weights. Current recommended area: {selectedArea || "—"}. Time tax = commute time &times; S$10/hr.
          </p>
        </div>
      </div>
    </section>
  );
}
