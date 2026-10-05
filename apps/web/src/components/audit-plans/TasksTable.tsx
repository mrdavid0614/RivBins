import type { AuditTaskRow } from '@rivbins/shared';
import Link from 'next/link';
import { formatDateTime } from '@/lib/format';
import { BAND_STYLES, scoreBand } from '@/lib/score-bands';
import { tasksHref } from './TaskFilters';

function ScoreBadge({ score }: { score: number | null }) {
  return (
    <span
      className={`inline-block min-w-9 rounded px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${
        BAND_STYLES[scoreBand(score)].cell
      }`}
    >
      {score ?? '—'}
    </span>
  );
}

function StatusBadge({ status }: { status: AuditTaskRow['status'] }) {
  return status === 'PENDING' ? (
    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-200">
      Pending
    </span>
  ) : (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      Done
    </span>
  );
}

const HEAD = 'px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500';
const CELL = 'px-3 py-2 whitespace-nowrap';

/** Tasks, newest plan first, then by rank. */
export function TasksTable({ tasks }: { tasks: AuditTaskRow[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-zinc-500">No tasks match this filter.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className={HEAD}>Plan</th>
            <th className={HEAD}>Rank</th>
            <th className={HEAD}>Bin</th>
            <th className={HEAD} title="Score when the plan was created">Score at plan</th>
            <th className={HEAD}>Current score</th>
            <th className={HEAD}>Status</th>
            <th className={HEAD}>Created</th>
            <th className={HEAD}>Completed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {tasks.map((task) => (
            <tr key={task.id}>
              <td className={CELL}>
                <Link href={tasksHref(null, task.planId)} className="underline-offset-2 hover:underline">
                  #{task.planId}
                </Link>
              </td>
              <td className={`${CELL} tabular-nums`}>{task.rank}</td>
              <td className={CELL}>
                <Link
                  href={`/?bin=${encodeURIComponent(task.binCode)}`}
                  className="font-mono font-medium underline-offset-2 hover:underline"
                >
                  {task.binCode}
                </Link>
              </td>
              <td className={CELL}>
                <ScoreBadge score={task.scoreAtCreation} />
              </td>
              <td className={CELL}>
                <ScoreBadge score={task.currentScore} />
              </td>
              <td className={CELL}>
                <StatusBadge status={task.status} />
              </td>
              <td className={`${CELL} text-zinc-600 dark:text-zinc-400`}>{formatDateTime(task.createdAt)}</td>
              <td className={`${CELL} text-zinc-600 dark:text-zinc-400`}>{formatDateTime(task.completedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
