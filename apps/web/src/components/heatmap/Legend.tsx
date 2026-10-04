import { BAND_STYLES, LEGEND_BANDS } from '@/lib/score-bands';

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
      {LEGEND_BANDS.map((band) => (
        <li key={band} className="flex items-center gap-1.5">
          <span className={`size-3 rounded-sm ${BAND_STYLES[band].swatch}`} aria-hidden />
          {BAND_STYLES[band].label}
          {band !== 'none' && <span className="text-zinc-400">({BAND_STYLES[band].range})</span>}
        </li>
      ))}
    </ul>
  );
}
