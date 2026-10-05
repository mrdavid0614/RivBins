// Pure Top-N selection for audit plans (D-006, D-067). No DB access.

export interface PlanCandidate {
  binId: number;
  code: string;
  score: number;
}

/**
 * The `n` riskiest candidates, highest score first. Ties are broken by bin code so
 * the same scores always produce the same plan. The caller passes only eligible
 * bins: scored and without a PENDING task.
 */
export function selectTopBins(
  candidates: readonly PlanCandidate[],
  n: number,
): PlanCandidate[] {
  return [...candidates]
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
    .slice(0, Math.max(0, n));
}

/** A plan size is a whole number of at least 1; the upper bound is checked against the eligible bins (D-069). */
export function isValidPlanSize(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1;
}
