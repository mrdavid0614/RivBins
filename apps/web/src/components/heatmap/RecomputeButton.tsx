'use client';

import { useActionState } from 'react';
import { recomputeScores, type RecomputeState } from '@/app/actions';

const initialState: RecomputeState = { status: 'idle' };

export function RecomputeButton() {
  const [state, action, pending] = useActionState(recomputeScores, initialState);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? 'Recomputing…' : 'Recompute scores'}
      </button>
      <p aria-live="polite" className="min-h-4 text-xs text-zinc-500 dark:text-zinc-400">
        {!pending && state.status === 'done' && `${state.binsRecomputed} bins rescored`}
        {!pending && state.status === 'error' && (
          <span className="text-red-600 dark:text-red-400">{state.message}</span>
        )}
      </p>
    </form>
  );
}
