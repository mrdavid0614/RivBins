import type { FactorBreakdown as Factor } from '@rivbins/shared';

/** Ratios (D-052) and percentages print with at most 2 decimals. */
const percent = (ratio: number): string => `${Number((ratio * 100).toFixed(2))}%`;

function formatValue(factor: Factor, value: number): string {
  switch (factor.key) {
    case 'timeSinceLastAudit':
      return `${value} days`;
    case 'lastDiscrepancySize':
      return percent(value);
    default:
      return String(value);
  }
}

interface FactorBreakdownProps {
  factors: Factor[];
  score: number;
  neverAudited: boolean;
}

/** The "why" behind a score: each factor's raw value, threshold, weight, and points. */
export function FactorBreakdown({ factors, score, neverAudited }: FactorBreakdownProps) {
  const total = factors.reduce((sum, f) => sum + f.points, 0);

  return (
    <section aria-labelledby="factors-heading">
      <h3 id="factors-heading" className="mb-3 text-sm font-semibold">
        Why this score
      </h3>
      <ul className="flex flex-col gap-3">
        {factors.map((factor) => (
          <li key={factor.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>{factor.label}</span>
              <span className="font-medium tabular-nums">
                {factor.points.toFixed(2)} <span className="text-xs font-normal text-zinc-500">pts</span>
              </span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
              role="meter"
              aria-label={`${factor.label}: ${percent(factor.normalized)} of threshold`}
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={factor.normalized}
            >
              <div
                className="h-full rounded-full bg-zinc-700 dark:bg-zinc-300"
                style={{ width: percent(factor.normalized) }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {formatValue(factor, factor.rawValue)} of {formatValue(factor, factor.threshold)}
              {' · '}weight {percent(factor.weight)}
              {factor.key === 'timeSinceLastAudit' && neverAudited && ' · never audited, counts as the threshold'}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-zinc-200 pt-2 text-xs text-zinc-500 dark:border-zinc-800">
        {total.toFixed(2)} points in total, rounded to a score of {score}.
      </p>
    </section>
  );
}
