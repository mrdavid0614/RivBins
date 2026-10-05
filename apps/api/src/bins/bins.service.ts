import { Injectable, NotFoundException } from '@nestjs/common';
import type { BinDetailResponse, ScoreHistoryEntry } from '@rivbins/shared';
import { PENDING_TASK_SELECT } from '../audit-plans/pending-task.select.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toBinDetail, toScoreHistoryEntry } from './bins.mapper.js';

const SCORE_SELECT = {
  id: true,
  score: true,
  trigger: true,
  auditResultId: true,
  computedAt: true,
} as const;

@Injectable()
export class BinsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDetail(code: string): Promise<BinDetailResponse> {
    const bin = await this.prisma.bin.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        level: true,
        position: true,
        lastAuditedAt: true,
        rack: { select: { code: true, aisle: { select: { code: true } } } },
        currentScore: { select: { ...SCORE_SELECT, factors: true } },
        tasks: PENDING_TASK_SELECT,
        pallets: {
          select: {
            code: true,
            items: {
              select: {
                quantity: true,
                product: { select: { sku: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!bin) throw new NotFoundException(`Bin ${code} not found`);
    return toBinDetail(bin);
  }

  /** Newest first (D-063). Ties on computedAt fall back to insertion order. */
  async getScoreHistory(code: string, limit: number): Promise<ScoreHistoryEntry[]> {
    const bin = await this.prisma.bin.findUnique({
      where: { code },
      select: {
        scoreHistory: {
          select: SCORE_SELECT,
          orderBy: [{ computedAt: 'desc' }, { id: 'desc' }],
          take: limit,
        },
      },
    });
    if (!bin) throw new NotFoundException(`Bin ${code} not found`);
    return bin.scoreHistory.map(toScoreHistoryEntry);
  }
}
