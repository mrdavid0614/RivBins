import type { CountResultResponse } from '@rivbins/shared';
import Link from 'next/link';
import { formatRatio } from '@/lib/count';
import { OutcomeBadge } from './OutcomeBadge';
import { ScorePill } from './ScorePill';

/** What the save did: outcome, differences, inventory changes, and the new score. */
export function CountResult({
  result,
  nextTaskBinCode,
}: {
  result: CountResultResponse;
  nextTaskBinCode: string | null;
}) {
  const offLines = result.lines.filter((line) => line.difference !== 0);
  const overridden = result.autoOutcome !== result.finalOutcome;

  return (
    <div className="flex flex-col gap-5 pb-6" aria-live="polite">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-2xl font-semibold">{result.binCode}</h1>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          Saved as <OutcomeBadge outcome={result.finalOutcome} />
          {overridden && (
            <span className="text-zinc-500">
              (override; auto result was {result.autoOutcome === 'PASS' ? 'pass' : 'fail'})
            </span>
          )}
        </p>
        {result.completedTask && (
          <p className="text-sm text-sky-700 dark:text-sky-300">
            Task for plan #{result.completedTask.planId} marked done.
          </p>
        )}
      </header>

      <section className="flex items-center justify-around rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-zinc-500">Score before</span>
          <ScorePill score={result.previousScore} large />
        </div>
        <span aria-hidden className="text-2xl text-zinc-400">
          →
        </span>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-zinc-500">New score</span>
          <ScorePill score={result.newScore} large />
        </div>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <p>
          Counted <span className="font-semibold tabular-nums">{result.totalCounted}</span> of{' '}
          <span className="tabular-nums">{result.totalExpected}</span> expected units ·
          discrepancy {formatRatio(result.discrepancyRatio)}
        </p>
        {offLines.length > 0 ? (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {offLines.map((line) => (
              <li key={`${line.palletCode}-${line.sku}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate">{line.name}</span>
                  <span className="text-xs text-zinc-500">
                    <span className="font-mono">{line.palletCode}</span> · {line.expectedQty} →{' '}
                    {line.countedQty}
                  </span>
                </span>
                <span className="font-semibold tabular-nums text-red-700 dark:text-red-400">
                  {line.difference > 0 ? `+${line.difference}` : `−${-line.difference}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-emerald-700 dark:text-emerald-400">Every line matched.</p>
        )}
        <p className="text-zinc-600 dark:text-zinc-400">
          {result.adjustmentsCreated > 0
            ? `Inventory corrected with ${result.adjustmentsCreated} adjustment${result.adjustmentsCreated === 1 ? '' : 's'}.`
            : offLines.length > 0
              ? 'Differences recorded; inventory not changed.'
              : 'Inventory unchanged.'}
        </p>
      </section>

      <nav className="flex flex-col gap-2">
        {nextTaskBinCode && (
          <Link
            href={`/count/${encodeURIComponent(nextTaskBinCode)}`}
            className="rounded-lg bg-zinc-900 px-4 py-3 text-center font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Next pending task: <span className="font-mono">{nextTaskBinCode}</span>
          </Link>
        )}
        <Link
          href="/count"
          className="rounded-lg border border-zinc-300 px-4 py-3 text-center font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Count another bin
        </Link>
        <Link
          href={`/?bin=${encodeURIComponent(result.binCode)}`}
          className="text-center text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          View bin on the heatmap
        </Link>
      </nav>
    </div>
  );
}
