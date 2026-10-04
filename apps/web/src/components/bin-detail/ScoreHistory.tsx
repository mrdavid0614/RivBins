import type { ScoreHistoryEntry, ScoreTrigger } from '@rivbins/shared';
import { formatDateTime } from '@/lib/format';
import { BAND_STYLES, scoreBand } from '@/lib/score-bands';

const TRIGGER_LABELS: Record<ScoreTrigger, string> = {
  SEED: 'Initial seed',
  MANUAL_RECOMPUTE: 'Manual recompute',
  AUDIT: 'Audit',
};

/** Consecutive rows with the same score and trigger, newest first. */
interface HistoryRun {
  newest: ScoreHistoryEntry;
  oldest: ScoreHistoryEntry;
  count: number;
}

/**
 * Collapses repeated recomputes that didn't change the score into one line, so
 * the timeline shows the changes. Audit rows are never merged: each is its own event.
 */
function toRuns(entries: ScoreHistoryEntry[]): HistoryRun[] {
  const runs: HistoryRun[] = [];
  for (const entry of entries) {
    const last = runs.at(-1);
    if (
      last &&
      entry.trigger !== 'AUDIT' &&
      last.oldest.trigger === entry.trigger &&
      last.oldest.score === entry.score
    ) {
      last.oldest = entry;
      last.count += 1;
    } else {
      runs.push({ newest: entry, oldest: entry, count: 1 });
    }
  }
  return runs;
}

function triggerLabel({ newest, count }: HistoryRun): string {
  const label = TRIGGER_LABELS[newest.trigger];
  if (newest.auditResultId !== null) return `${label} #${newest.auditResultId}`;
  return count > 1 ? `${label} ×${count}` : label;
}

function timeLabel({ newest, oldest, count }: HistoryRun): string {
  if (count === 1) return formatDateTime(newest.computedAt);
  return `${formatDateTime(oldest.computedAt)} – ${formatDateTime(newest.computedAt)}`;
}

function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="text-zinc-400">±0</span>;
  // Up means riskier.
  const tone = value > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
  return <span className={tone}>{value > 0 ? `▲ ${value}` : `▼ ${-value}`}</span>;
}

/** Score timeline, newest first (D-063). The delta compares with the previous score. */
export function ScoreHistory({ entries, limit }: { entries: ScoreHistoryEntry[]; limit: number }) {
  const runs = toRuns(entries);

  return (
    <section aria-labelledby="history-heading">
      <h3 id="history-heading" className="mb-3 text-sm font-semibold">
        Score history
      </h3>
      {runs.length === 0 ? (
        <p className="text-sm text-zinc-500">No scores yet.</p>
      ) : (
        <ol className="flex flex-col">
          {runs.map((run, i) => {
            const previous = runs[i + 1];
            return (
              <li
                key={run.newest.id}
                className="flex items-center gap-3 border-l-2 border-zinc-200 py-1.5 pl-3 text-sm dark:border-zinc-800"
              >
                <span
                  className={`w-9 rounded px-1 text-center text-xs font-semibold tabular-nums ${BAND_STYLES[scoreBand(run.newest.score)].cell}`}
                >
                  {run.newest.score}
                </span>
                <span className="w-12 text-xs tabular-nums">
                  {previous && <Delta value={run.newest.score - previous.newest.score} />}
                </span>
                <span className="flex-1">
                  {triggerLabel(run)}
                  <span className="block text-xs text-zinc-500">{timeLabel(run)}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {entries.length === limit && (
        <p className="mt-2 text-xs text-zinc-500">Based on the latest {limit} scores.</p>
      )}
    </section>
  );
}
