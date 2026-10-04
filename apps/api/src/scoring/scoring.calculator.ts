// Pure scoring calculator: inputs → score + per-factor breakdown. No DB access.
// Rules: CLAUDE.md "Scoring System"; rounding: D-051.
import type { FactorBreakdown, ScoringFactorKey } from '@rivbins/shared';
import { FACTOR_ORDER, SCORING_CONFIG, type ScoringConfig } from './scoring.config.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Everything the calculator needs about one bin, already filtered by the loader. */
export interface ScoringInputs {
  /** null = never audited */
  lastAuditedAt: Date | null;
  /** PICK + PUTAWAY + MOVE (in or out) since the last audit */
  activityCount: number;
  /** ADJUSTMENT movements with no auditResultId since the last audit */
  manualAdjustmentCount: number;
  /** Audits with finalOutcome = FAIL inside the failure window */
  recentFailureCount: number;
  /** discrepancyRatio of the latest audit; null = never audited */
  lastDiscrepancyRatio: number | null;
  /** Distinct products on the pallets currently in the bin */
  distinctSkuCount: number;
}

export interface ScoreResult {
  /** 0–100 */
  score: number;
  factors: FactorBreakdown[];
}

const round = (value: number, decimals: number): number =>
  Math.round(value * 10 ** decimals) / 10 ** decimals;
const round2 = (value: number): number => round(value, 2);

/** Ratios keep 4 decimals so they show as a percentage with 2 (D-054). */
const RAW_DECIMALS: Partial<Record<ScoringFactorKey, number>> = {
  lastDiscrepancySize: 4,
};
const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

function rawValues(
  inputs: ScoringInputs,
  now: Date,
  config: ScoringConfig,
): Record<ScoringFactorKey, number> {
  const daysSinceAudit =
    inputs.lastAuditedAt === null
      ? config.factors.timeSinceLastAudit.threshold // never audited = max staleness
      : Math.max(0, (now.getTime() - inputs.lastAuditedAt.getTime()) / DAY_MS);

  return {
    timeSinceLastAudit: daysSinceAudit,
    activitySinceLastAudit: inputs.activityCount,
    adjustmentsSinceLastAudit: inputs.manualAdjustmentCount,
    auditFailureHistory: inputs.recentFailureCount,
    lastDiscrepancySize: inputs.lastDiscrepancyRatio ?? 0,
    skuMix: inputs.distinctSkuCount,
  };
}

function normalize(key: ScoringFactorKey, raw: number, threshold: number): number {
  // SKU mix: a single-SKU (or empty) bin scores 0, `threshold` SKUs or more score 1.
  if (key === 'skuMix') return clamp01((raw - 1) / (threshold - 1));
  return clamp01(raw / threshold);
}

export function calculateScore(
  inputs: ScoringInputs,
  now: Date,
  config: ScoringConfig = SCORING_CONFIG,
): ScoreResult {
  const raw = rawValues(inputs, now, config);

  let total = 0;
  const factors = FACTOR_ORDER.map((key): FactorBreakdown => {
    const { label, threshold, weight } = config.factors[key];
    const normalized = normalize(key, raw[key], threshold);
    const points = normalized * weight * 100;
    total += points;
    return {
      key,
      label,
      rawValue: round(raw[key], RAW_DECIMALS[key] ?? 2),
      threshold,
      normalized: round2(normalized),
      weight,
      points: round2(points),
    };
  });

  // Rounded from the unrounded sum (D-051); clamped against float drift.
  const score = Math.min(Math.max(Math.round(total), 0), 100);
  return { score, factors };
}
