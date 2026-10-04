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

  // Lock the bins (in id order, to avoid deadlocks) before reading inputs. A
  // concurrent count then either finishes first, and we read its committed
  // changes, or waits for us. Without this, a full recompute could repoint
  // currentScoreId at a score built from pre-audit inputs (D-056).
  await tx.$queryRaw`
    SELECT id FROM "Bin" WHERE id = ANY(${[...binIds]}::int[]) ORDER BY id FOR UPDATE`;

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
