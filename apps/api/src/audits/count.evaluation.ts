// Pure evaluation of a bin count: per-line differences, the auto outcome, and the
// discrepancy ratio stored on the AuditResult (CLAUDE.md "Count Logic", D-002, D-003).
import type { AuditOutcome } from '@rivbins/shared';

export interface CountedLine {
  expectedQty: number;
  countedQty: number;
}

export type EvaluatedLine<T extends CountedLine> = T & {
  /** counted − expected */
  difference: number;
  withinTolerance: boolean;
};

export interface CountEvaluation<T extends CountedLine> {
  lines: EvaluatedLine<T>[];
  /** PASS only when every line is within tolerance; an empty bin passes (D-076). */
  autoOutcome: AuditOutcome;
  totalExpected: number;
  totalCounted: number;
  /** Σ|counted − expected| / Σ expected; 0 when nothing is expected. */
  discrepancyRatio: number;
}

export function evaluateCount<T extends CountedLine>(
  lines: readonly T[],
  toleranceUnits: number,
): CountEvaluation<T> {
  let totalExpected = 0;
  let totalCounted = 0;
  let totalAbsDiff = 0;

  const evaluated = lines.map((line) => {
    const difference = line.countedQty - line.expectedQty;
    totalExpected += line.expectedQty;
    totalCounted += line.countedQty;
    totalAbsDiff += Math.abs(difference);
    return {
      ...line,
      difference,
      withinTolerance: Math.abs(difference) <= toleranceUnits,
    };
  });

  return {
    lines: evaluated,
    autoOutcome: evaluated.every((line) => line.withinTolerance)
      ? 'PASS'
      : 'FAIL',
    totalExpected,
    totalCounted,
    // Per line, so errors on different lines never cancel out (D-003).
    discrepancyRatio: totalExpected === 0 ? 0 : totalAbsDiff / totalExpected,
  };
}
