import { apiFetch } from '@/lib/api';

interface HealthStatus {
  status: 'ok';
  database: 'up';
}

async function getApiStatus(): Promise<'up' | 'down'> {
  try {
    await apiFetch<HealthStatus>('/health');
    return 'up';
  } catch {
    return 'down';
  }
}

export default async function HomePage() {
  const apiStatus = await getApiStatus();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Smart Cycle Count Scoring</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        The heatmap dashboard, audit plans, and mobile count flow will live here.
      </p>
      <p className="text-sm">
        API status:{' '}
        <span className={apiStatus === 'up' ? 'font-medium text-green-600' : 'font-medium text-red-600'}>
          {apiStatus}
        </span>
      </p>
    </main>
  );
}
