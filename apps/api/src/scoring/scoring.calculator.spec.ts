import type { ScoringFactorKey } from '@rivbins/shared';
import { calculateScore, type ScoringInputs } from './scoring.calculator.js';
import {
  assertValidConfig,
  FACTOR_ORDER,
  SCORING_CONFIG,
  type ScoringConfig,
} from './scoring.config.js';

const NOW = new Date('2026-10-04T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number): Date => new Date(NOW.getTime() - days * DAY_MS);

/** A bin audited right now with nothing going on: every factor is 0. */
const quietBin: ScoringInputs = {
  lastAuditedAt: NOW,
  activityCount: 0,
  manualAdjustmentCount: 0,
  recentFailureCount: 0,
  lastDiscrepancyRatio: 0,
  distinctSkuCount: 1,
};

function factor(inputs: Partial<ScoringInputs>, key: ScoringFactorKey) {
  const result = calculateScore({ ...quietBin, ...inputs }, NOW);
  const found = result.factors.find((f) => f.key === key);
  if (!found) throw new Error(`missing factor ${key}`);
  return found;
}

describe('scoring config', () => {
  it('has weights that sum to 1', () => {
    const total = FACTOR_ORDER.reduce(
      (sum, key) => sum + SCORING_CONFIG.factors[key].weight,
      0,
    );
    expect(total).toBeCloseTo(1, 10);
  });

  it('rejects weights that do not sum to 1', () => {
    const broken: ScoringConfig = structuredClone(SCORING_CONFIG);
    broken.factors.skuMix.weight = 0.2;
    expect(() => assertValidConfig(broken)).toThrow(/sum to 1/);
  });

  it('rejects a non-positive threshold', () => {
    const broken: ScoringConfig = structuredClone(SCORING_CONFIG);
    broken.factors.activitySinceLastAudit.threshold = 0;
    expect(() => assertValidConfig(broken)).toThrow(/activitySinceLastAudit/);
  });
});

describe('calculateScore', () => {
  it('scores a freshly audited, quiet, single-SKU bin as 0', () => {
    const result = calculateScore(quietBin, NOW);
    expect(result.score).toBe(0);
    expect(result.factors.every((f) => f.points === 0)).toBe(true);
  });

  it('scores 100 when every factor is at or above its threshold', () => {
    const result = calculateScore(
      {
        lastAuditedAt: daysAgo(45),
        activityCount: 200,
        manualAdjustmentCount: 9,
        recentFailureCount: 3,
        lastDiscrepancyRatio: 0.5,
        distinctSkuCount: 12,
      },
      NOW,
    );
    expect(result.score).toBe(100);
    expect(result.factors.every((f) => f.normalized === 1)).toBe(true);
  });

  it('returns the six factors in the configured order with their config', () => {
    const { factors } = calculateScore(quietBin, NOW);
    expect(factors.map((f) => f.key)).toEqual(FACTOR_ORDER);
    for (const f of factors) {
      expect(f.threshold).toBe(SCORING_CONFIG.factors[f.key].threshold);
      expect(f.weight).toBe(SCORING_CONFIG.factors[f.key].weight);
      expect(f.label).toBe(SCORING_CONFIG.factors[f.key].label);
    }
  });

  describe('factor 1: time since last audit', () => {
    it('treats a never-audited bin as maximum staleness', () => {
      const f = factor({ lastAuditedAt: null }, 'timeSinceLastAudit');
      expect(f.rawValue).toBe(30);
      expect(f.normalized).toBe(1);
      expect(f.points).toBe(25);
    });

    it('uses fractional days', () => {
      const f = factor({ lastAuditedAt: daysAgo(7.5) }, 'timeSinceLastAudit');
      expect(f.rawValue).toBe(7.5);
      expect(f.normalized).toBe(0.25);
      expect(f.points).toBe(6.25);
    });

    it('caps at the threshold', () => {
      const f = factor({ lastAuditedAt: daysAgo(90) }, 'timeSinceLastAudit');
      expect(f.rawValue).toBe(90);
      expect(f.normalized).toBe(1);
    });

    it('never goes negative for an audit dated after now', () => {
      const f = factor(
        { lastAuditedAt: new Date(NOW.getTime() + DAY_MS) },
        'timeSinceLastAudit',
      );
      expect(f.rawValue).toBe(0);
      expect(f.normalized).toBe(0);
    });
  });

  describe('factor 2: activity since last audit', () => {
    it('normalizes against 60 movements', () => {
      expect(factor({ activityCount: 30 }, 'activitySinceLastAudit')).toMatchObject({
        rawValue: 30,
        normalized: 0.5,
        points: 10,
      });
    });

    it('caps at 1', () => {
      expect(factor({ activityCount: 150 }, 'activitySinceLastAudit').normalized).toBe(1);
    });
  });

  describe('factor 3: manual adjustments since last audit', () => {
    it('normalizes against 5 adjustments', () => {
      expect(
        factor({ manualAdjustmentCount: 2 }, 'adjustmentsSinceLastAudit'),
      ).toMatchObject({ rawValue: 2, normalized: 0.4, points: 6 });
    });

    it('caps at 1', () => {
      expect(
        factor({ manualAdjustmentCount: 8 }, 'adjustmentsSinceLastAudit').normalized,
      ).toBe(1);
    });
  });

  describe('factor 4: audit failure history', () => {
    it('normalizes against 2 failures', () => {
      expect(factor({ recentFailureCount: 1 }, 'auditFailureHistory')).toMatchObject({
        rawValue: 1,
        normalized: 0.5,
        points: 7.5,
      });
    });

    it('caps at 1', () => {
      expect(factor({ recentFailureCount: 4 }, 'auditFailureHistory').normalized).toBe(1);
    });
  });

  describe('factor 5: last discrepancy size', () => {
    it('is 0 for a never-audited bin', () => {
      const f = factor({ lastDiscrepancyRatio: null }, 'lastDiscrepancySize');
      expect(f.rawValue).toBe(0);
      expect(f.points).toBe(0);
    });

    it('normalizes the ratio against 20%', () => {
      expect(
        factor({ lastDiscrepancyRatio: 0.05 }, 'lastDiscrepancySize'),
      ).toMatchObject({ rawValue: 0.05, threshold: 0.2, normalized: 0.25, points: 3.75 });
    });

    it('caps at 1', () => {
      expect(
        factor({ lastDiscrepancyRatio: 0.6 }, 'lastDiscrepancySize').normalized,
      ).toBe(1);
    });

    it('keeps 4 decimals on the ratio so it matches its points', () => {
      expect(
        factor({ lastDiscrepancyRatio: 0.099303 }, 'lastDiscrepancySize'),
      ).toMatchObject({ rawValue: 0.0993, normalized: 0.5, points: 7.45 });
    });
  });

  describe('factor 6: SKU mix', () => {
    it.each([
      [0, 0],
      [1, 0],
      [2, 0.2],
      [4, 0.6],
      [6, 1],
      [10, 1],
    ])('%i SKUs normalize to %d', (skus, normalized) => {
      expect(factor({ distinctSkuCount: skus }, 'skuMix').normalized).toBe(normalized);
    });
  });

  describe('combination', () => {
    it('rounds the unrounded sum of contributions', () => {
      // 20/60 × 20 = 6.666… plus 1/5 × 15 = 3 → 9.666… → 10
      const result = calculateScore(
        { ...quietBin, activityCount: 20, manualAdjustmentCount: 1 },
        NOW,
      );
      expect(result.factors.map((f) => f.points)).toContain(6.67);
      expect(result.score).toBe(10);
    });

    it('keeps the displayed points within rounding of the score', () => {
      const result = calculateScore(
        {
          lastAuditedAt: daysAgo(11.3),
          activityCount: 17,
          manualAdjustmentCount: 1,
          recentFailureCount: 1,
          lastDiscrepancyRatio: 0.07,
          distinctSkuCount: 3,
        },
        NOW,
      );
      const sum = result.factors.reduce((s, f) => s + f.points, 0);
      expect(Math.abs(sum - result.score)).toBeLessThanOrEqual(0.5 + 0.03);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('accepts a custom config', () => {
      const config: ScoringConfig = structuredClone(SCORING_CONFIG);
      config.factors.activitySinceLastAudit.threshold = 10;
      const result = calculateScore({ ...quietBin, activityCount: 5 }, NOW, config);
      expect(result.score).toBe(10);
    });
  });

  describe('feedback loop', () => {
    const busyNeverAudited: ScoringInputs = {
      lastAuditedAt: null,
      activityCount: 48,
      manualAdjustmentCount: 3,
      recentFailureCount: 0,
      lastDiscrepancyRatio: null,
      distinctSkuCount: 4,
    };

    // After any audit the loader resets the "since last audit" counts to 0.
    const justAudited = (
      discrepancy: number,
      failures: number,
    ): ScoringInputs => ({
      ...busyNeverAudited,
      lastAuditedAt: NOW,
      activityCount: 0,
      manualAdjustmentCount: 0,
      recentFailureCount: failures,
      lastDiscrepancyRatio: discrepancy,
    });

    it('drops sharply after a passed audit', () => {
      const before = calculateScore(busyNeverAudited, NOW).score;
      const after = calculateScore(justAudited(0, 0), NOW).score;
      expect(before).toBe(25 + 16 + 9 + 0 + 0 + 6);
      expect(after).toBe(6); // only the SKU mix remains
    });

    it('keeps a badly failed bin risky right after the count', () => {
      const passed = calculateScore(justAudited(0, 0), NOW).score;
      const failed = calculateScore(justAudited(0.25, 1), NOW).score;
      expect(failed).toBe(29); // 6 (SKUs) + 7.5 (1 failure) + 15 (25% off) = 28.5
      expect(failed).toBeGreaterThan(passed + 20);
    });
  });
});
