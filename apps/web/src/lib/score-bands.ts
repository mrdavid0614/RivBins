// Heatmap color bands (D-061). Tailwind needs the full class names in source,
// so every band spells out its classes.

export type ScoreBand = 'low' | 'medium' | 'high' | 'none';

interface BandStyle {
  label: string;
  /** Score range shown in the legend. */
  range: string;
  /** Heatmap cell background and text. */
  cell: string;
  /** Small swatch or badge. */
  swatch: string;
}

export const MEDIUM_MIN = 40;
export const HIGH_MIN = 70;

export function scoreBand(score: number | null): ScoreBand {
  if (score === null) return 'none';
  if (score >= HIGH_MIN) return 'high';
  if (score >= MEDIUM_MIN) return 'medium';
  return 'low';
}

export const BAND_STYLES: Record<ScoreBand, BandStyle> = {
  low: {
    label: 'Low risk',
    range: `0–${MEDIUM_MIN - 1}`,
    cell: 'bg-emerald-600 text-white hover:bg-emerald-700',
    swatch: 'bg-emerald-600',
  },
  medium: {
    label: 'Medium risk',
    range: `${MEDIUM_MIN}–${HIGH_MIN - 1}`,
    cell: 'bg-amber-400 text-amber-950 hover:bg-amber-500',
    swatch: 'bg-amber-400',
  },
  high: {
    label: 'High risk',
    range: `${HIGH_MIN}–100`,
    cell: 'bg-red-600 text-white hover:bg-red-700',
    swatch: 'bg-red-600',
  },
  none: {
    label: 'Not scored',
    range: '—',
    cell: 'bg-zinc-300 text-zinc-700 hover:bg-zinc-400 dark:bg-zinc-700 dark:text-zinc-200',
    swatch: 'bg-zinc-300 dark:bg-zinc-700',
  },
};

/** Bands in legend order. */
export const LEGEND_BANDS: readonly ScoreBand[] = ['low', 'medium', 'high', 'none'];
