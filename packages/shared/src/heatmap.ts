import type { PendingTaskRef } from './audit-plans.js';
import type { ScoreTrigger } from './enums.js';
import type { FactorBreakdown } from './scoring.js';

// Dates are ISO 8601 strings: the API serializes them with JSON.

/** One cell of the heatmap. */
export interface HeatmapBin {
  id: number;
  code: string;
  /** Grid row (shelf height), 1 = floor level. */
  level: number;
  /** Grid column. */
  position: number;
  /** Current 0–100 score; null when the bin was never scored. */
  score: number | null;
  scoreComputedAt: string | null;
  lastAuditedAt: string | null;
  /** The bin's open audit task; null when it has none. */
  pendingTask: PendingTaskRef | null;
}

export interface HeatmapRack {
  code: string;
  /** Highest level in the rack: the grid's row count. */
  levels: number;
  /** Highest position in the rack: the grid's column count. */
  positions: number;
  bins: HeatmapBin[];
}

export interface HeatmapAisle {
  code: string;
  racks: HeatmapRack[];
}

/** Response of GET /warehouse/layout (D-060). */
export interface WarehouseLayoutResponse {
  warehouse: { code: string; name: string };
  aisles: HeatmapAisle[];
}

export interface CurrentScore {
  score: number;
  trigger: ScoreTrigger;
  computedAt: string;
  factors: FactorBreakdown[];
}

export interface PalletLine {
  sku: string;
  name: string;
  quantity: number;
}

export interface BinPallet {
  code: string;
  /** Only lines with quantity > 0 (D-065). */
  items: PalletLine[];
}

/** Response of GET /bins/:code (D-060, D-062). */
export interface BinDetailResponse {
  id: number;
  code: string;
  aisle: string;
  rack: string;
  level: number;
  position: number;
  lastAuditedAt: string | null;
  currentScore: CurrentScore | null;
  /** The bin's open audit task; null when it has none. */
  pendingTask: PendingTaskRef | null;
  pallets: BinPallet[];
}

/** One row of GET /bins/:code/scores, newest first (D-063). */
export interface ScoreHistoryEntry {
  id: number;
  score: number;
  trigger: ScoreTrigger;
  /** Set when trigger = AUDIT. */
  auditResultId: number | null;
  computedAt: string;
}
