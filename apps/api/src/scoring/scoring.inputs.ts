// Loads the calculator inputs for a set of bins with a fixed number of queries
// (not one per bin). Accepts the Prisma client or a transaction client, so the
// service, the seed runner, and (later) the audit flow can share it.
import type { Prisma } from '../generated/prisma/client.js';
import type { ScoringInputs } from './scoring.calculator.js';
import { SCORING_CONFIG, type ScoringConfig } from './scoring.config.js';

export type ScoringDb = Prisma.TransactionClient;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Activity movements for factor 2; ADJUSTMENT only feeds factor 3. */
const ACTIVITY_TYPES = new Set(['PICK', 'PUTAWAY', 'MOVE']);

/**
 * Returns the inputs of every existing bin in `binIds`, keyed by bin ID.
 * Unknown IDs are left out of the map.
 */
export async function loadScoringInputs(
  db: ScoringDb,
  binIds: readonly number[],
  now: Date,
  config: ScoringConfig = SCORING_CONFIG,
): Promise<Map<number, ScoringInputs>> {
  const ids = [...binIds];
  const failureWindowStart = new Date(
    now.getTime() - config.failureWindowDays * DAY_MS,
  );

  const [bins, movements, failures, lastAudits, lines] = await Promise.all([
    db.bin.findMany({
      where: { id: { in: ids } },
      select: { id: true, lastAuditedAt: true },
    }),
    // Full history of these bins; each bin's "since last audit" window is applied
    // below, because the cut-off differs per bin. A MOVE touches both bins (D-012).
    db.movement.findMany({
      where: {
        occurredAt: { lte: now },
        OR: [{ binId: { in: ids } }, { fromBinId: { in: ids } }],
      },
      select: {
        type: true,
        binId: true,
        fromBinId: true,
        auditResultId: true,
        occurredAt: true,
      },
    }),
    // Factor 4: fixed window, does not reset on audit (D-011, D-013).
    db.auditResult.groupBy({
      by: ['binId'],
      where: {
        binId: { in: ids },
        finalOutcome: 'FAIL',
        countedAt: { gte: failureWindowStart, lte: now },
      },
      _count: { _all: true },
    }),
    // Factor 5: the latest audit per bin, regardless of the override.
    db.auditResult.findMany({
      where: { binId: { in: ids }, countedAt: { lte: now } },
      distinct: ['binId'],
      orderBy: [{ binId: 'asc' }, { countedAt: 'desc' }, { id: 'desc' }],
      select: { binId: true, discrepancyRatio: true },
    }),
    // Factor 6: lines with stock left; a line counted down to 0 holds no product.
    db.palletItem.findMany({
      where: { quantity: { gt: 0 }, pallet: { binId: { in: ids } } },
      select: { productId: true, pallet: { select: { binId: true } } },
    }),
  ]);

  const inputs = new Map<number, ScoringInputs>();
  for (const bin of bins) {
    inputs.set(bin.id, {
      lastAuditedAt: bin.lastAuditedAt,
      activityCount: 0,
      manualAdjustmentCount: 0,
      recentFailureCount: 0,
      lastDiscrepancyRatio: null,
      distinctSkuCount: 0,
    });
  }

  for (const m of movements) {
    // A movement can concern two bins (MOVE): count it once for each.
    for (const binId of new Set([m.binId, m.fromBinId])) {
      const bin = binId === null ? undefined : inputs.get(binId);
      if (!bin) continue;
      // Movements up to the last audit were verified by that count.
      if (bin.lastAuditedAt !== null && m.occurredAt <= bin.lastAuditedAt) continue;

      if (ACTIVITY_TYPES.has(m.type)) {
        bin.activityCount += 1;
      } else if (m.type === 'ADJUSTMENT' && m.auditResultId === null) {
        // Audit-generated adjustments are excluded (captured by factors 4 and 5).
        bin.manualAdjustmentCount += 1;
      }
    }
  }

  for (const f of failures) {
    const bin = inputs.get(f.binId);
    if (bin) bin.recentFailureCount = f._count._all;
  }

  for (const audit of lastAudits) {
    const bin = inputs.get(audit.binId);
    if (bin) bin.lastDiscrepancyRatio = audit.discrepancyRatio;
  }

  const skusByBin = new Map<number, Set<number>>();
  for (const line of lines) {
    const set = skusByBin.get(line.pallet.binId) ?? new Set<number>();
    set.add(line.productId);
    skusByBin.set(line.pallet.binId, set);
  }
  for (const [binId, skus] of skusByBin) {
    const bin = inputs.get(binId);
    if (bin) bin.distinctSkuCount = skus.size;
  }

  return inputs;
}
