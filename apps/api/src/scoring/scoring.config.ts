// Single source of truth for the scoring model (CLAUDE.md "Scoring System", D-050).
// Every BinScore row stores the threshold and weight it used, so changing these
// values never makes old scores unexplainable.
import type { ScoringFactorKey } from '@rivbins/shared';

export interface FactorConfig {
  label: string;
  threshold: number;
  /** 0–1; all weights sum to 1 */
  weight: number;
}

export interface ScoringConfig {
  factors: Record<ScoringFactorKey, FactorConfig>;
  /** Factor 4 counts failed audits inside this fixed window (does not reset on audit). */
  failureWindowDays: number;
}

/** Breakdown order, as shown in the UI. */
export const FACTOR_ORDER: readonly ScoringFactorKey[] = [
  'timeSinceLastAudit',
  'activitySinceLastAudit',
  'adjustmentsSinceLastAudit',
  'auditFailureHistory',
  'lastDiscrepancySize',
  'skuMix',
];

export const SCORING_CONFIG: ScoringConfig = {
  factors: {
    timeSinceLastAudit: {
      label: 'Days since last audit',
      threshold: 30,
      weight: 0.25,
    },
    activitySinceLastAudit: {
      label: 'Movements since last audit',
      threshold: 60,
      weight: 0.2,
    },
    adjustmentsSinceLastAudit: {
      label: 'Manual adjustments since last audit',
      threshold: 5,
      weight: 0.15,
    },
    auditFailureHistory: {
      label: 'Failed audits (last 90 days)',
      threshold: 2,
      weight: 0.15,
    },
    lastDiscrepancySize: {
      // Ratio, not percent (D-052): 0.2 = 20%.
      label: 'Last audit discrepancy',
      threshold: 0.2,
      weight: 0.15,
    },
    skuMix: {
      label: 'Distinct SKUs in bin',
      threshold: 6,
      weight: 0.1,
    },
  },
  failureWindowDays: 90,
};

/** Throws if the weights don't sum to 1 or a threshold can't normalize. */
export function assertValidConfig(config: ScoringConfig): void {
  const total = FACTOR_ORDER.reduce(
    (sum, key) => sum + config.factors[key].weight,
    0,
  );
  if (Math.abs(total - 1) > 1e-9) {
    throw new Error(`Scoring weights must sum to 1 (got ${total})`);
  }
  for (const key of FACTOR_ORDER) {
    const { threshold, weight } = config.factors[key];
    if (!(threshold > 0) || weight < 0) {
      throw new Error(`Invalid threshold or weight for factor ${key}`);
    }
  }
  // SKU mix normalizes by (threshold − 1).
  if (!(config.factors.skuMix.threshold > 1)) {
    throw new Error('The skuMix threshold must be greater than 1');
  }
}

assertValidConfig(SCORING_CONFIG);
