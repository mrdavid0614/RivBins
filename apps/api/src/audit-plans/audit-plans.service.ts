import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type {
  AuditPlanEligibility,
  AuditPlanResponse,
  AuditPlanSummary,
  AuditTaskRow,
  TaskStatus,
} from '@rivbins/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  toAuditPlan,
  toAuditPlanSummary,
  toAuditTaskRow,
} from './audit-plans.mapper.js';
import { selectTopBins } from './audit-plans.selection.js';

/** Scored bins without a PENDING task can join a plan (D-006, D-067). */
const ELIGIBLE_BIN: Prisma.BinWhereInput = {
  currentScoreId: { not: null },
  tasks: { none: { status: 'PENDING' } },
};

const TASK_SELECT = {
  id: true,
  planId: true,
  rank: true,
  scoreAtCreation: true,
  status: true,
  createdAt: true,
  completedAt: true,
  bin: { select: { code: true, currentScore: { select: { score: true } } } },
} as const;

export interface TaskFilter {
  status?: TaskStatus;
  planId?: number;
  limit: number;
}

@Injectable()
export class AuditPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async getEligibility(): Promise<AuditPlanEligibility> {
    return {
      eligibleBins: await this.prisma.bin.count({ where: ELIGIBLE_BIN }),
    };
  }

  /**
   * Creates a plan with the Top N eligible bins. N is validated against the
   * eligible bins inside the transaction (D-068, D-069).
   */
  async createPlan(n: number): Promise<AuditPlanResponse> {
    return this.prisma.$transaction(async (tx) => {
      // Serializes plan creation: two concurrent plans would otherwise read the
      // same eligible bins, and the second one would lose its tasks to the
      // pending-task index instead of taking the next riskiest bins.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('rivbins:audit-plans'))`;

      const bins = await tx.bin.findMany({
        where: ELIGIBLE_BIN,
        select: {
          id: true,
          code: true,
          currentScore: { select: { score: true } },
        },
      });
      if (bins.length === 0) {
        throw new ConflictException(
          'Every scored bin already has a pending audit task',
        );
      }
      if (n > bins.length) {
        throw new BadRequestException(
          `n must be between 1 and ${bins.length} (the eligible bins)`,
        );
      }

      const selected = selectTopBins(
        bins.flatMap((b) =>
          b.currentScore
            ? [{ binId: b.id, code: b.code, score: b.currentScore.score }]
            : [],
        ),
        n,
      );

      const plan = await tx.auditPlan.create({
        data: { requestedN: n },
        select: { id: true },
      });
      // A bin that already has a PENDING task violates "AuditTask_binId_pending_key";
      // ON CONFLICT DO NOTHING skips it as "already pending". Under the lock above
      // this only happens if a task was created outside this service.
      await tx.auditTask.createMany({
        data: selected.map((bin, i) => ({
          planId: plan.id,
          binId: bin.binId,
          rank: i + 1,
          scoreAtCreation: bin.score,
        })),
        skipDuplicates: true,
      });

      const created = await tx.auditPlan.findUniqueOrThrow({
        where: { id: plan.id },
        select: {
          id: true,
          requestedN: true,
          createdAt: true,
          tasks: { select: TASK_SELECT },
        },
      });
      return toAuditPlan(created);
    });
  }

  /** Plan summaries, newest first. */
  async listPlans(): Promise<AuditPlanSummary[]> {
    const plans = await this.prisma.auditPlan.findMany({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        requestedN: true,
        createdAt: true,
        tasks: { select: { status: true } },
      },
    });
    return plans.map(toAuditPlanSummary);
  }

  /** Task rows, newest plan first, then by rank. */
  async listTasks({
    status,
    planId,
    limit,
  }: TaskFilter): Promise<AuditTaskRow[]> {
    const tasks = await this.prisma.auditTask.findMany({
      where: { status, planId },
      orderBy: [{ planId: 'desc' }, { rank: 'asc' }],
      take: limit,
      select: TASK_SELECT,
    });
    return tasks.map(toAuditTaskRow);
  }
}
