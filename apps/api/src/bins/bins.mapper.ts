// Pure mapping from Prisma rows to the GET /bins/:code and /bins/:code/scores contracts.
import type {
  BinDetailResponse,
  FactorBreakdown,
  PendingTaskRef,
  ScoreHistoryEntry,
  ScoreTrigger,
} from '@rivbins/shared';

export interface ScoreRow {
  id: number;
  score: number;
  trigger: ScoreTrigger;
  auditResultId: number | null;
  computedAt: Date;
}

export interface BinDetailRow {
  id: number;
  code: string;
  level: number;
  position: number;
  lastAuditedAt: Date | null;
  rack: { code: string; aisle: { code: string } };
  /** `factors` is the BinScore JSON column: FactorBreakdown[] as written by the scorer. */
  currentScore: (ScoreRow & { factors: unknown }) | null;
  /** PENDING tasks only: at most one. */
  tasks: PendingTaskRef[];
  pallets: {
    code: string;
    items: { quantity: number; product: { sku: string; name: string } }[];
  }[];
}

export function toBinDetail(row: BinDetailRow): BinDetailResponse {
  const current = row.currentScore;
  return {
    id: row.id,
    code: row.code,
    aisle: row.rack.aisle.code,
    rack: row.rack.code,
    level: row.level,
    position: row.position,
    lastAuditedAt: row.lastAuditedAt?.toISOString() ?? null,
    currentScore: current && {
      score: current.score,
      trigger: current.trigger,
      computedAt: current.computedAt.toISOString(),
      // Stored with the threshold and weight it used, so it is shown as is.
      factors: current.factors as FactorBreakdown[],
    },
    pendingTask: row.tasks[0] ?? null,
    pallets: [...row.pallets]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((pallet) => ({
        code: pallet.code,
        // A line counted down to 0 holds no product (D-065, D-055).
        items: pallet.items
          .filter((item) => item.quantity > 0)
          .map((item) => ({
            sku: item.product.sku,
            name: item.product.name,
            quantity: item.quantity,
          }))
          .sort((a, b) => a.sku.localeCompare(b.sku)),
      })),
  };
}

export function toScoreHistoryEntry(row: ScoreRow): ScoreHistoryEntry {
  return {
    id: row.id,
    score: row.score,
    trigger: row.trigger,
    auditResultId: row.auditResultId,
    computedAt: row.computedAt.toISOString(),
  };
}
