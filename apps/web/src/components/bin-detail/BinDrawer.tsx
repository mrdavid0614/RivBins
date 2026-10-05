import type { BinDetailResponse, ScoreHistoryEntry } from '@rivbins/shared';
import Link from 'next/link';
import { PendingMarker } from '@/components/heatmap/RackGrid';
import { ApiError, apiFetch } from '@/lib/api';
import { formatAge, formatDateTime } from '@/lib/format';
import { BAND_STYLES, scoreBand } from '@/lib/score-bands';
import { DrawerShell } from './DrawerShell';
import { FactorBreakdown } from './FactorBreakdown';
import { PalletList } from './PalletList';
import { ScoreHistory } from './ScoreHistory';

const HISTORY_LIMIT = 20;

type DrawerData =
  | { status: 'ok'; bin: BinDetailResponse; history: ScoreHistoryEntry[] }
  | { status: 'not-found' }
  | { status: 'error' };

async function loadBin(code: string): Promise<DrawerData> {
  const path = `/bins/${encodeURIComponent(code)}`;
  try {
    const [bin, history] = await Promise.all([
      apiFetch<BinDetailResponse>(path),
      apiFetch<ScoreHistoryEntry[]>(`${path}/scores?limit=${HISTORY_LIMIT}`),
    ]);
    return { status: 'ok', bin, history };
  } catch (error) {
    return { status: error instanceof ApiError && error.status === 404 ? 'not-found' : 'error' };
  }
}

/** Server-rendered bin detail for `?bin=<code>` (D-064). */
export async function BinDrawer({ code }: { code: string }) {
  const data = await loadBin(code);

  if (data.status !== 'ok') {
    return (
      <DrawerShell title={`Bin ${code}`}>
        <p role="alert" className="text-sm text-zinc-600 dark:text-zinc-400">
          {data.status === 'not-found'
            ? `There is no bin with code ${code}.`
            : 'Could not load this bin. Check that the API is running.'}
        </p>
      </DrawerShell>
    );
  }

  const { bin, history } = data;
  const current = bin.currentScore;
  const band = BAND_STYLES[scoreBand(current?.score ?? null)];
  const now = new Date();

  return (
    <DrawerShell title={`Bin ${bin.code}`}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-mono text-xl font-semibold">{bin.code}</h2>
          <p className="text-xs text-zinc-500">
            Aisle {bin.aisle} · Rack {bin.rack} · Level {bin.level} · Position {bin.position}
          </p>
          <p className="mt-2 text-sm">
            Last audit:{' '}
            {bin.lastAuditedAt ? (
              <>
                {formatDateTime(bin.lastAuditedAt)}{' '}
                <span className="text-zinc-500">({formatAge(bin.lastAuditedAt, now)})</span>
              </>
            ) : (
              <span className="text-zinc-500">never audited</span>
            )}
          </p>
          {bin.pendingTask && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-sky-700 dark:text-sky-300">
              <PendingMarker />
              Pending audit task ·{' '}
              <Link href={`/tasks?plan=${bin.pendingTask.planId}`} className="underline underline-offset-2">
                plan #{bin.pendingTask.planId}
              </Link>
              , rank {bin.pendingTask.rank}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-lg px-3 py-1.5 text-2xl font-bold tabular-nums ${band.cell}`}>
            {current?.score ?? '—'}
          </span>
          <span className="text-xs text-zinc-500">{band.label}</span>
        </div>
      </header>

      {current ? (
        <FactorBreakdown
          factors={current.factors}
          score={current.score}
          neverAudited={bin.lastAuditedAt === null}
        />
      ) : (
        <p className="text-sm text-zinc-500">This bin has not been scored yet. Run “Recompute scores”.</p>
      )}

      <ScoreHistory entries={history} limit={HISTORY_LIMIT} />
      <PalletList pallets={bin.pallets} />
    </DrawerShell>
  );
}
