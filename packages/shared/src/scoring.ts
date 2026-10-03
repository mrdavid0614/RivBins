export type ScoringFactorKey =
  | 'timeSinceLastAudit'
  | 'activitySinceLastAudit'
  | 'adjustmentsSinceLastAudit'
  | 'auditFailureHistory'
  | 'lastDiscrepancySize'
  | 'skuMix';

/** One factor's contribution to a bin score, persisted in BinScore.factors. */
export interface FactorBreakdown {
  key: ScoringFactorKey;
  label: string;
  rawValue: number;
  threshold: number;
  /** 0–1 */
  normalized: number;
  /** 0–1; all weights sum to 1 */
  weight: number;
  /** Contribution to the 0–100 score: normalized × weight × 100 */
  points: number;
}
