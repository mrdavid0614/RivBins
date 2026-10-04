import type { WarehouseLayoutResponse } from '@rivbins/shared';
import { Heatmap } from '@/components/heatmap/Heatmap';
import { Legend } from '@/components/heatmap/Legend';
import { RecomputeButton } from '@/components/heatmap/RecomputeButton';
import { apiFetch } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

async function getLayout(): Promise<WarehouseLayoutResponse | null> {
  try {
    return await apiFetch<WarehouseLayoutResponse>('/warehouse/layout');
  } catch {
    return null;
  }
}

/** Latest score timestamp across all bins: when the heatmap was last recomputed. */
function lastComputedAt(layout: WarehouseLayoutResponse): string | null {
  const times = layout.aisles
    .flatMap((a) => a.racks.flatMap((r) => r.bins.map((b) => b.scoreComputedAt)))
    .filter((t): t is string => t !== null)
    .sort();
  return times.at(-1) ?? null;
}

export default async function HeatmapPage(props: PageProps<'/'>) {
  const { bin } = await props.searchParams;
  const selectedCode = typeof bin === 'string' ? bin.toUpperCase() : null;
  const layout = await getLayout();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Bin risk heatmap</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {layout
              ? `${layout.warehouse.name} · last scored ${formatDateTime(lastComputedAt(layout), 'never')}`
              : 'Smart Cycle Count Scoring'}
            . Select a bin to see why it scores what it does.
          </p>
          <Legend />
        </div>
        <RecomputeButton />
      </header>

      {layout ? (
        <Heatmap layout={layout} selectedCode={selectedCode} />
      ) : (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Could not load the warehouse layout. Check that the API is running and the database is seeded.
        </p>
      )}
    </main>
  );
}
