import { Injectable, NotFoundException } from '@nestjs/common';
import type { RecomputeScoresResponse, ScoreTrigger } from '@rivbins/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ScoringDb } from './scoring.inputs.js';
import { computeAndStoreScores } from './scoring.persist.js';

const TX_TIMEOUT_MS = 30_000;

@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  /** Manual "Recompute scores": every bin gets a new MANUAL_RECOMPUTE row (D-005). */
  async recomputeAll(): Promise<RecomputeScoresResponse> {
    const now = new Date();
    const binsRecomputed = await this.prisma.$transaction(
      async (tx) => {
        const bins = await tx.bin.findMany({ select: { id: true } });
        return computeAndStoreScores(
          tx,
          bins.map((b) => b.id),
          { trigger: 'MANUAL_RECOMPUTE', now },
        );
      },
      { timeout: TX_TIMEOUT_MS },
    );
    return {
      trigger: 'MANUAL_RECOMPUTE',
      binsRecomputed,
      computedAt: now.toISOString(),
    };
  }

  /**
   * Recomputes one bin. The audit flow passes its own transaction so the score is
   * saved together with the audit result.
   */
  async recomputeBin(
    binId: number,
    trigger: ScoreTrigger,
    auditResultId?: number,
    tx?: ScoringDb,
  ): Promise<void> {
    const run = async (db: ScoringDb): Promise<void> => {
      const scored = await computeAndStoreScores(db, [binId], {
        trigger,
        auditResultId,
        now: new Date(),
      });
      if (scored === 0) throw new NotFoundException(`Bin ${binId} not found`);
    };

    if (tx) return run(tx);
    return this.prisma.$transaction(run, { timeout: TX_TIMEOUT_MS });
  }
}
