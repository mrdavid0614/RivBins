import { BAND_STYLES, scoreBand } from '@/lib/score-bands';

/** A score in its heatmap band color (D-061). */
export function ScorePill({ score, large = false }: { score: number | null; large?: boolean }) {
  return (
    <span
      className={`inline-block rounded-md text-center font-semibold tabular-nums ${
        large ? 'min-w-14 px-3 py-1.5 text-2xl' : 'min-w-9 px-1.5 py-0.5 text-xs'
      } ${BAND_STYLES[scoreBand(score)].cell}`}
    >
      {score ?? '—'}
    </span>
  );
}
