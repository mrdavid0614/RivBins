import type { HeatmapBin, HeatmapRack } from '@rivbins/shared';
import Link from 'next/link';
import { BAND_STYLES, scoreBand } from '@/lib/score-bands';

interface RackGridProps {
  aisle: string;
  rack: HeatmapRack;
  selectedCode: string | null;
}

/** One rack as a level × position grid, top shelf first, like the physical rack. */
export function RackGrid({ aisle, rack, selectedCode }: RackGridProps) {
  const levels = Array.from({ length: rack.levels }, (_, i) => rack.levels - i);

  return (
    <section className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Rack {aisle}-{rack.code}
      </h3>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `auto repeat(${rack.positions}, minmax(0, 1fr))` }}
      >
        {levels.map((level) => (
          <RackRow
            key={level}
            level={level}
            positions={rack.positions}
            bins={rack.bins.filter((b) => b.level === level)}
            selectedCode={selectedCode}
          />
        ))}
      </div>
    </section>
  );
}

function RackRow({
  level,
  positions,
  bins,
  selectedCode,
}: {
  level: number;
  positions: number;
  bins: HeatmapBin[];
  selectedCode: string | null;
}) {
  return (
    <>
      <span className="self-center pr-1 text-xs text-zinc-400">L{level}</span>
      {Array.from({ length: positions }, (_, i) => {
        const bin = bins.find((b) => b.position === i + 1);
        return bin ? (
          <BinCell key={bin.id} bin={bin} selected={bin.code === selectedCode} />
        ) : (
          // A missing slot stays visible as a gap.
          <span key={`empty-${i}`} className="rounded-md border border-dashed border-zinc-200 dark:border-zinc-800" />
        );
      })}
    </>
  );
}

function BinCell({ bin, selected }: { bin: HeatmapBin; selected: boolean }) {
  const style = BAND_STYLES[scoreBand(bin.score)];
  return (
    <Link
      href={`/?bin=${encodeURIComponent(bin.code)}`}
      scroll={false}
      aria-label={`Bin ${bin.code}, score ${bin.score ?? 'not computed'}${
        bin.pendingTask ? ', pending audit task' : ''
      }`}
      aria-current={selected ? 'true' : undefined}
      className={`relative flex aspect-[4/3] flex-col items-center justify-center rounded-md transition ${style.cell} ${
        selected ? 'ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-zinc-950' : ''
      }`}
    >
      {bin.pendingTask && <PendingMarker className="absolute top-1 right-1" />}
      <span className="text-lg font-semibold leading-none tabular-nums">{bin.score ?? '—'}</span>
      <span className="mt-1 text-[10px] font-medium opacity-90">{bin.code}</span>
    </Link>
  );
}

/** Marks a bin with a PENDING audit task (D-067). */
export function PendingMarker({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`size-2.5 rounded-full bg-sky-500 ring-2 ring-white dark:ring-zinc-950 ${className}`}
    />
  );
}
