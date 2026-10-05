// Pure mapping from Prisma rows to the count flow contracts.
import type {
  AuditOutcome,
  CountResultResponse,
  CountSheetResponse,
  PendingTaskRef,
} from '@rivbins/shared';
import type { CountConfig } from './count.config.js';
import type { CountEvaluation } from './count.evaluation.js';

export interface PalletItemRow {
  id: number;
  quantity: number;
  product: { id: number; sku: string; name: string };
}

export interface CountSheetRow {
  id: number;
  code: string;
  lastAuditedAt: Date | null;
  currentScore: { score: number } | null;
  /** PENDING tasks only: at most one. */
  tasks: PendingTaskRef[];
  pallets: { code: string; items: PalletItemRow[] }[];
}

export function toCountSheet(
  row: CountSheetRow,
  config: CountConfig,
): CountSheetResponse {
  return {
    binId: row.id,
    code: row.code,
    lastAuditedAt: row.lastAuditedAt?.toISOString() ?? null,
    currentScore: row.currentScore?.score ?? null,
    pendingTask: row.tasks[0] ?? null,
    toleranceUnits: config.toleranceUnits,
    maxCountedQty: config.maxCountedQty,
    pallets: [...row.pallets]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((pallet) => ({
        code: pallet.code,
        // A line at 0 holds no product, so it isn't counted (D-073).
        lines: pallet.items
          .filter((item) => item.quantity > 0)
          .sort((a, b) => a.product.sku.localeCompare(b.product.sku))
          .map((item) => ({
            palletItemId: item.id,
            sku: item.product.sku,
            name: item.product.name,
            expectedQty: item.quantity,
          })),
      }))
      .filter((pallet) => pallet.lines.length > 0),
  };
}

/** A line of the bin as read inside the save transaction. */
export interface SavedLine {
  palletItemId: number;
  palletId: number;
  palletCode: string;
  productId: number;
  sku: string;
  name: string;
  expectedQty: number;
  countedQty: number;
}

export interface CountResultInput {
  auditResultId: number;
  binCode: string;
  finalOutcome: AuditOutcome;
  countedAt: Date;
  evaluation: CountEvaluation<SavedLine>;
  adjustmentsCreated: number;
  completedTask: PendingTaskRef | null;
  previousScore: number | null;
  newScore: number;
}

export function toCountResult(input: CountResultInput): CountResultResponse {
  const { evaluation } = input;
  return {
    auditResultId: input.auditResultId,
    binCode: input.binCode,
    autoOutcome: evaluation.autoOutcome,
    finalOutcome: input.finalOutcome,
    totalExpected: evaluation.totalExpected,
    totalCounted: evaluation.totalCounted,
    discrepancyRatio: evaluation.discrepancyRatio,
    countedAt: input.countedAt.toISOString(),
    lines: evaluation.lines.map((line) => ({
      palletCode: line.palletCode,
      sku: line.sku,
      name: line.name,
      expectedQty: line.expectedQty,
      countedQty: line.countedQty,
      difference: line.difference,
    })),
    adjustmentsCreated: input.adjustmentsCreated,
    completedTask: input.completedTask,
    previousScore: input.previousScore,
    newScore: input.newScore,
  };
}
