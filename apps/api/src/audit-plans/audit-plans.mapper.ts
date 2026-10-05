// Pure mapping from Prisma rows to the audit plan and task contracts.
import type {
  AuditPlanResponse,
  AuditPlanSummary,
  AuditTaskRow,
  TaskStatus,
} from '@rivbins/shared';

export interface TaskRow {
  id: number;
  planId: number;
  rank: number;
  scoreAtCreation: number;
  status: TaskStatus;
  createdAt: Date;
  completedAt: Date | null;
  bin: { code: string; currentScore: { score: number } | null };
}

export interface PlanRow {
  id: number;
  requestedN: number;
  createdAt: Date;
}

export function toAuditTaskRow(row: TaskRow): AuditTaskRow {
  return {
    id: row.id,
    planId: row.planId,
    rank: row.rank,
    binCode: row.bin.code,
    scoreAtCreation: row.scoreAtCreation,
    currentScore: row.bin.currentScore?.score ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export function toAuditPlan(
  row: PlanRow & { tasks: TaskRow[] },
): AuditPlanResponse {
  return {
    id: row.id,
    requestedN: row.requestedN,
    createdAt: row.createdAt.toISOString(),
    tasks: [...row.tasks].sort((a, b) => a.rank - b.rank).map(toAuditTaskRow),
  };
}

export function toAuditPlanSummary(
  row: PlanRow & { tasks: { status: TaskStatus }[] },
): AuditPlanSummary {
  const pendingCount = row.tasks.filter((t) => t.status === 'PENDING').length;
  return {
    id: row.id,
    requestedN: row.requestedN,
    createdAt: row.createdAt.toISOString(),
    taskCount: row.tasks.length,
    pendingCount,
    doneCount: row.tasks.length - pendingCount,
  };
}
