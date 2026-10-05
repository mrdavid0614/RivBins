import type { TaskStatus } from '@rivbins/shared';
import Link from 'next/link';

const OPTIONS: { label: string; status: TaskStatus | null }[] = [
  { label: 'All', status: null },
  { label: 'Pending', status: 'PENDING' },
  { label: 'Done', status: 'DONE' },
];

export function tasksHref(status: TaskStatus | null, planId: number | null): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status.toLowerCase());
  if (planId !== null) params.set('plan', String(planId));
  const query = params.toString();
  return query ? `/tasks?${query}` : '/tasks';
}

/** Status tabs; a plan filter shows as a removable chip. */
export function TaskFilters({ status, planId }: { status: TaskStatus | null; planId: number | null }) {
  return (
    <nav aria-label="Filter tasks" className="flex flex-wrap items-center gap-2 text-sm">
      {OPTIONS.map((option) => {
        const active = option.status === status;
        return (
          <Link
            key={option.label}
            href={tasksHref(option.status, planId)}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-3 py-1 transition ${
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            {option.label}
          </Link>
        );
      })}
      {planId !== null && (
        <Link
          href={tasksHref(status, null)}
          aria-label={`Remove plan #${planId} filter`}
          className="rounded-full border border-zinc-300 px-3 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Plan #{planId} ✕
        </Link>
      )}
    </nav>
  );
}
