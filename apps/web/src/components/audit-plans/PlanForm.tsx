'use client';

import { useActionState } from 'react';
import { generateAuditPlan, type GeneratePlanState } from '@/app/tasks/actions';

const initialState: GeneratePlanState = { status: 'idle' };
const DEFAULT_N = 5;

/** N input + "Generate audit plan". N is capped at the eligible bins (D-069). */
export function PlanForm({ eligibleBins }: { eligibleBins: number }) {
  const [state, action, pending] = useActionState(generateAuditPlan, initialState);
  const none = eligibleBins === 0;

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Bins to audit (N)</span>
          <input
            name="n"
            type="number"
            required
            min={1}
            max={Math.max(1, eligibleBins)}
            step={1}
            defaultValue={Math.min(DEFAULT_N, Math.max(1, eligibleBins))}
            disabled={none || pending}
            className="w-28 rounded-md border border-zinc-300 bg-white px-3 py-2 tabular-nums disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          disabled={none || pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? 'Generating…' : 'Generate audit plan'}
        </button>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {none
          ? 'Every scored bin already has a pending task. Complete some counts first.'
          : `${eligibleBins} bin${eligibleBins === 1 ? '' : 's'} eligible: scored and without a pending task.`}
      </p>
      <p aria-live="polite" className="min-h-4 text-sm">
        {!pending && state.status === 'done' && (
          <span className="text-emerald-700 dark:text-emerald-400">
            Created plan #{state.planId} with {state.taskCount} task{state.taskCount === 1 ? '' : 's'}.
          </span>
        )}
        {!pending && state.status === 'error' && (
          <span className="text-red-600 dark:text-red-400">{state.message}</span>
        )}
      </p>
    </form>
  );
}
