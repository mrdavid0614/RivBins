import type { AuditTaskRow } from '@rivbins/shared';
import { PendingTaskList } from '@/components/count/PendingTaskList';
import { apiFetch } from '@/lib/api';
import { openBin } from './actions';

const TASKS_LIMIT = 50;

async function loadPendingTasks(): Promise<AuditTaskRow[] | null> {
  try {
    return await apiFetch<AuditTaskRow[]>(`/audit-tasks?status=PENDING&limit=${TASKS_LIMIT}`);
  } catch {
    return null;
  }
}

/** Count flow, step 1: pick a bin by code or from the pending tasks. */
export default async function CountPage() {
  const tasks = await loadPendingTasks();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Count a bin</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Type or scan a bin code, or pick a pending task.
        </p>
      </header>

      <form action={openBin} className="flex gap-2">
        <label className="sr-only" htmlFor="bin-code">
          Bin code
        </label>
        <input
          id="bin-code"
          name="code"
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="A-01-03"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-mono text-lg uppercase dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-5 py-3 font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Open
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pending tasks</h2>
        {tasks ? (
          <PendingTaskList tasks={tasks} />
        ) : (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            Could not load pending tasks. Check that the API is running.
          </p>
        )}
      </section>
    </main>
  );
}
