// Pure mapping from Prisma rows to the GET /warehouse/layout contract.
import type { PendingTaskRef, WarehouseLayoutResponse } from '@rivbins/shared';

export interface LayoutRow {
  code: string;
  name: string;
  aisles: {
    code: string;
    position: number;
    racks: {
      code: string;
      position: number;
      bins: {
        id: number;
        code: string;
        level: number;
        position: number;
        lastAuditedAt: Date | null;
        currentScore: { score: number; computedAt: Date } | null;
        /** PENDING tasks only: at most one. */
        tasks: PendingTaskRef[];
      }[];
    }[];
  }[];
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position;

/**
 * Sorts aisles and racks by display position and bins top shelf first, so the
 * grid reads like the physical rack. Grid size comes from the highest level and
 * position, so gaps in a rack stay visible.
 */
export function toWarehouseLayout(row: LayoutRow): WarehouseLayoutResponse {
  return {
    warehouse: { code: row.code, name: row.name },
    aisles: [...row.aisles].sort(byPosition).map((aisle) => ({
      code: aisle.code,
      racks: [...aisle.racks].sort(byPosition).map((rack) => ({
        code: rack.code,
        levels: Math.max(0, ...rack.bins.map((b) => b.level)),
        positions: Math.max(0, ...rack.bins.map((b) => b.position)),
        bins: [...rack.bins]
          .sort((a, b) => b.level - a.level || a.position - b.position)
          .map((bin) => ({
            id: bin.id,
            code: bin.code,
            level: bin.level,
            position: bin.position,
            score: bin.currentScore?.score ?? null,
            scoreComputedAt: bin.currentScore?.computedAt.toISOString() ?? null,
            lastAuditedAt: bin.lastAuditedAt?.toISOString() ?? null,
            pendingTask: bin.tasks[0] ?? null,
          })),
      })),
    })),
  };
}
