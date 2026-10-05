import type { AuditTaskRow } from '@rivbins/shared';
import Link from 'next/link';
import { ScorePill } from './ScorePill';

/** Pending tasks as large tap targets, in the tasks table order. */
export function PendingTaskList({ tasks }: { tasks: AuditTaskRow[] }) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No pending tasks. Generate an audit plan, or search for any bin above.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            href={`/count/${encodeURIComponent(task.binCode)}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 transition hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span className="flex flex-col">
              <span className="font-mono text-lg font-semibold">{task.binCode}</span>
              <span className="text-xs text-zinc-500">
                Plan #{task.planId} · rank {task.rank}
              </span>
            </span>
            <ScorePill score={task.currentScore} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
