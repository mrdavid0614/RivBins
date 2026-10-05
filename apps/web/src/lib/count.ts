// Live preview of a count while the user types. The API recomputes the outcome on
// save with the same rule (apps/api/src/audits/count.evaluation.ts, D-002).
import type { AuditOutcome, CountSheetResponse } from '@rivbins/shared';

/** A whole number of units up to `max`, or null while the input is empty or invalid. */
export function parseCount(value: string | undefined, max: number): number | null {
  if (value === undefined || !/^\d+$/.test(value.trim())) return null;
  const counted = Number(value.trim());
  return counted <= max ? counted : null;
}

/** True when the input holds a number above the API's limit (maxCountedQty). */
export function isTooLarge(value: string | undefined, max: number): boolean {
  return value !== undefined && /^\d+$/.test(value.trim()) && Number(value.trim()) > max;
}

export interface CountPreview {
  autoOutcome: AuditOutcome;
  /** Lines whose difference is not 0. */
  mismatchedLines: number;
  discrepancyRatio: number;
}

/** Null until every line has a count. */
export function previewCount(
  sheet: CountSheetResponse,
  counts: Readonly<Record<number, string>>,
): CountPreview | null {
  let totalExpected = 0;
  let totalAbsDiff = 0;
  let mismatchedLines = 0;
  let pass = true;

  for (const line of sheet.pallets.flatMap((pallet) => pallet.lines)) {
    const counted = parseCount(counts[line.palletItemId], sheet.maxCountedQty);
    if (counted === null) return null;
    const diff = Math.abs(counted - line.expectedQty);
    totalExpected += line.expectedQty;
    totalAbsDiff += diff;
    if (diff !== 0) mismatchedLines += 1;
    if (diff > sheet.toleranceUnits) pass = false;
  }

  return {
    autoOutcome: pass ? 'PASS' : 'FAIL',
    mismatchedLines,
    discrepancyRatio: totalExpected === 0 ? 0 : totalAbsDiff / totalExpected,
  };
}

/** "12.5%" for a 0.125 ratio (D-052). */
export const formatRatio = (ratio: number): string =>
  `${(ratio * 100).toFixed(ratio === 0 ? 0 : 1)}%`;
