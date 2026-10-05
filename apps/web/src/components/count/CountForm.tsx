'use client';

import type { AuditOutcome, CountSheetResponse, SubmitCountRequest } from '@rivbins/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveCount, type SaveCountState } from '@/app/count/actions';
import { formatDateTime } from '@/lib/format';
import { formatRatio, isTooLarge, parseCount, previewCount } from '@/lib/count';
import { CountResult } from './CountResult';
import { OutcomeBadge } from './OutcomeBadge';
import { ScorePill } from './ScorePill';

function DiffBadge({
  expected,
  value,
  max,
}: {
  expected: number;
  value: string | undefined;
  max: number;
}) {
  const counted = parseCount(value, max);
  if (counted === null) return <span className="w-10" />;
  const diff = counted - expected;
  return (
    <span
      className={`w-10 text-right text-sm font-semibold tabular-nums ${
        diff === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
      }`}
    >
      {diff === 0 ? '✓' : diff > 0 ? `+${diff}` : `−${-diff}`}
    </span>
  );
}

const OUTCOMES: readonly AuditOutcome[] = ['PASS', 'FAIL'];

/** Count sheet with per-line inputs, the live auto outcome, an override, and save (D-002, D-003). */
export function CountForm({ sheet }: { sheet: CountSheetResponse }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<number, string>>({});
  /** The user's choice; null = use the auto outcome. */
  const [chosen, setChosen] = useState<AuditOutcome | null>(null);
  const [state, setState] = useState<SaveCountState>({ status: 'idle' });
  const [pending, startTransition] = useTransition();

  if (state.status === 'done') {
    return <CountResult result={state.result} nextTaskBinCode={state.nextTaskBinCode} />;
  }

  const lines = sheet.pallets.flatMap((pallet) => pallet.lines);
  const remaining = lines.filter(
    (line) => parseCount(counts[line.palletItemId], sheet.maxCountedQty) === null,
  ).length;
  const preview = previewCount(sheet, counts);
  const finalOutcome = chosen ?? preview?.autoOutcome ?? null;
  const overridden = preview !== null && finalOutcome !== preview.autoOutcome;

  function save() {
    if (!preview || !finalOutcome) return;
    const body: SubmitCountRequest = {
      finalOutcome,
      lines: lines.map((line) => ({
        palletItemId: line.palletItemId,
        expectedQty: line.expectedQty,
        countedQty: parseCount(counts[line.palletItemId], sheet.maxCountedQty) ?? 0,
      })),
    };
    startTransition(async () => {
      setState(await saveCount(sheet.code, body));
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-semibold">{sheet.code}</h1>
          <p className="text-xs text-zinc-500">
            Last audit: {formatDateTime(sheet.lastAuditedAt, 'never')}
          </p>
          <p className="mt-1 text-sm">
            {sheet.pendingTask ? (
              <span className="text-sky-700 dark:text-sky-300">
                Completes plan #{sheet.pendingTask.planId}, rank {sheet.pendingTask.rank}
              </span>
            ) : (
              <span className="text-zinc-500">Ad-hoc count (no pending task)</span>
            )}
          </p>
        </div>
        <ScorePill score={sheet.currentScore} large />
      </header>

      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          The system expects this bin to be empty. Check that it is, then save to confirm.
        </p>
      ) : (
        sheet.pallets.map((pallet) => (
          <section
            key={pallet.code}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800"
            aria-label={`Pallet ${pallet.code}`}
          >
            <h2 className="border-b border-zinc-200 px-4 py-2 font-mono text-sm font-semibold dark:border-zinc-800">
              {pallet.code}
            </h2>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {pallet.lines.map((line) => {
                const id = `count-${line.palletItemId}`;
                const value = counts[line.palletItemId];
                const tooLarge = isTooLarge(value, sheet.maxCountedQty);
                return (
                  <li key={line.palletItemId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                    <label htmlFor={id} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{line.name}</span>
                      <span className="block text-xs text-zinc-500">
                        <span className="font-mono">{line.sku}</span> · expected{' '}
                        <span className="font-semibold tabular-nums">{line.expectedQty}</span>
                      </span>
                    </label>
                    <input
                      id={id}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={String(sheet.maxCountedQty).length}
                      aria-invalid={tooLarge}
                      aria-describedby={tooLarge ? `${id}-error` : undefined}
                      autoComplete="off"
                      enterKeyHint="next"
                      placeholder="0"
                      value={value ?? ''}
                      onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, '');
                        setCounts((previous) => ({ ...previous, [line.palletItemId]: value }));
                      }}
                      disabled={pending}
                      className="w-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-right text-lg tabular-nums aria-invalid:border-red-600 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <DiffBadge expected={line.expectedQty} value={value} max={sheet.maxCountedQty} />
                    {tooLarge && (
                      <p id={`${id}-error`} className="w-full text-right text-xs text-red-700 dark:text-red-400">
                        At most {sheet.maxCountedQty.toLocaleString('en-US')} units
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <footer className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-3 border-t border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        {preview ? (
          <>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              Auto result: <OutcomeBadge outcome={preview.autoOutcome} />
              <span className="text-zinc-500">
                {preview.mismatchedLines} line{preview.mismatchedLines === 1 ? '' : 's'} off ·
                discrepancy {formatRatio(preview.discrepancyRatio)}
              </span>
            </p>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">Final result</legend>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOMES.map((outcome) => {
                  const selected = finalOutcome === outcome;
                  return (
                    <button
                      key={outcome}
                      type="button"
                      aria-pressed={selected}
                      disabled={pending}
                      onClick={() => setChosen(outcome === preview.autoOutcome ? null : outcome)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        selected
                          ? outcome === 'PASS'
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-red-600 bg-red-600 text-white'
                          : 'border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900'
                      }`}
                    >
                      {outcome === 'PASS' ? 'Pass' : 'Fail'}
                      {outcome === preview.autoOutcome && ' (auto)'}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-500">
                {overridden && 'Override: both the auto and the final result are saved. '}
                {finalOutcome === 'FAIL'
                  ? preview.mismatchedLines > 0
                    ? `Inventory is corrected to the counted quantities on ${preview.mismatchedLines} line${preview.mismatchedLines === 1 ? '' : 's'}.`
                    : 'No line is off, so inventory stays as is.'
                  : preview.mismatchedLines > 0
                    ? 'Differences are recorded; inventory is not changed.'
                    : 'Every line matches.'}
              </p>
            </fieldset>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Count {remaining} more line{remaining === 1 ? '' : 's'} to see the result.
          </p>
        )}

        {state.status === 'stale' && (
          <div role="alert" className="flex flex-col gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <p>{state.message}</p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="self-start rounded-md border border-amber-400 px-3 py-1.5 font-medium"
            >
              Reload the sheet
            </button>
          </div>
        )}
        {state.status === 'error' && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {state.message}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={!preview || pending}
          className="rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? 'Saving…' : 'Save count'}
        </button>
      </footer>
    </div>
  );
}
