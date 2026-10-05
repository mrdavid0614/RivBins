import type { AuditPlanEligibility, AuditTaskRow, TaskStatus } from '@rivbins/shared';
import { PlanForm } from '@/components/audit-plans/PlanForm';
import { TaskFilters } from '@/components/audit-plans/TaskFilters';
import { TasksTable } from '@/components/audit-plans/TasksTable';
import { apiFetch } from '@/lib/api';

/** Rows the table asks for; the API's own default is the same (D-067). */
const TASKS_LIMIT = 100;
/** Largest plan id the API accepts (INT4, MAX_PLAN_ID in the audit-plans controller). */
const MAX_PLAN_ID = 2_147_483_647;

function parseStatus(value: string | string[] | undefined): TaskStatus | null {
  if (value === 'pending') return 'PENDING';
  if (value === 'done') return 'DONE';
  return null;
}

function parsePlanId(value: string | string[] | undefined): number | null {
  const id = typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isInteger(id) && id > 0 && id <= MAX_PLAN_ID ? id : null;
}

async function loadTasksPage(
  status: TaskStatus | null,
  planId: number | null,
): Promise<{ eligibility: AuditPlanEligibility; tasks: AuditTaskRow[] } | null> {
  const query = new URLSearchParams({ limit: String(TASKS_LIMIT) });
  if (status) query.set('status', status);
  if (planId !== null) query.set('planId', String(planId));
  try {
    const [eligibility, tasks] = await Promise.all([
      apiFetch<AuditPlanEligibility>('/audit-plans/eligibility'),
      apiFetch<AuditTaskRow[]>(`/audit-tasks?${query.toString()}`),
    ]);
    return { eligibility, tasks };
  } catch {
    return null;
  }
}

export default async function TasksPage(props: PageProps<'/tasks'>) {
  const searchParams = await props.searchParams;
  const status = parseStatus(searchParams.status);
  const planId = parsePlanId(searchParams.plan);
  const data = await loadTasksPage(status, planId);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Audit plans</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          A plan picks the N riskiest bins by current score, skipping bins that already have a
          pending task.
        </p>
      </header>

      {data ? (
        <>
          <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <PlanForm eligibleBins={data.eligibility.eligibleBins} />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <TaskFilters status={status} planId={planId} />
            <TasksTable tasks={data.tasks} />
            {data.tasks.length === TASKS_LIMIT && (
              <p className="text-xs text-zinc-500">
                Showing the {TASKS_LIMIT} most recent tasks. Filter by status or plan to see older ones.
              </p>
            )}
          </section>
        </>
      ) : (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Could not load audit plans. Check that the API is running and the database is seeded.
        </p>
      )}
    </main>
  );
}
