// Computes and stores scores for a set of bins: one new BinScore row per bin plus
// Bin.currentScoreId pointing at it (append-only history, D-014). Run it inside a
// transaction so the history row and the pointer change together.
import type { ScoreTrigger } from '@rivbins/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { calculateScore } from './scoring.calculator.js';
import { loadScoringInputs, type ScoringDb } from './scoring.inputs.js';

export interface PersistScoresOptions {
  trigger: ScoreTrigger;
  /** Required when trigger = AUDIT. */
  auditResultId?: number;
  /** Shared by every row of the run; becomes BinScore.computedAt. */
  now: Date;
}

/** Returns the number of bins scored (bins that don't exist are skipped). */
export async function computeAndStoreScores(
  tx: ScoringDb,
  binIds: readonly number[],
  { trigger, auditResultId, now }: PersistScoresOptions,
): Promise<number> {
  if ((trigger === 'AUDIT') !== (auditResultId !== undefined)) {
    throw new Error('auditResultId is required for, and only for, AUDIT scores');
  }

  const inputs = await loadScoringInputs(tx, binIds, now);

  for (const [binId, binInputs] of inputs) {
    const { score, factors } = calculateScore(binInputs, now);
    const row = await tx.binScore.create({
      data: {
        binId,
        score,
        factors: factors as unknown as Prisma.InputJsonValue,
        trigger,
        auditResultId: auditResultId ?? null,
        computedAt: now,
      },
      select: { id: true },
    });
    await tx.bin.update({
      where: { id: binId },
      data: { currentScoreId: row.id },
    });
  }

  return inputs.size;
}
