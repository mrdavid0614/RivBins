import type { PendingTaskRef } from './audit-plans.js';
import type { AuditOutcome } from './enums.js';

// Dates are ISO 8601 strings: the API serializes them with JSON.

/** One product line on a pallet, as the counter sees it. */
export interface CountSheetLine {
  palletItemId: number;
  sku: string;
  name: string;
  expectedQty: number;
}

export interface CountSheetPallet {
  code: string;
  /** Only lines with quantity > 0 (D-073). */
  lines: CountSheetLine[];
}

/** Response of GET /bins/:code/count-sheet (D-072). */
export interface CountSheetResponse {
  binId: number;
  code: string;
  lastAuditedAt: string | null;
  /** The bin's current score; null when it was never scored. */
  currentScore: number | null;
  /** The task this count completes; null for an ad-hoc count. */
  pendingTask: PendingTaskRef | null;
  /** A line passes when |counted − expected| ≤ this many units (D-002). */
  toleranceUnits: number;
  /** Largest quantity a line can be counted as; the API rejects more. */
  maxCountedQty: number;
  /** Empty for an empty bin, which can still be counted (D-076). */
  pallets: CountSheetPallet[];
}

export interface CountLineInput {
  palletItemId: number;
  /** The quantity the counter saw on the sheet; a mismatch means it is stale (D-075). */
  expectedQty: number;
  countedQty: number;
}

/** Body of POST /bins/:code/counts (D-072). */
export interface SubmitCountRequest {
  /** Exactly one entry per line on the count sheet. */
  lines: CountLineInput[];
  /** The user's verdict; may override the auto outcome (D-002). */
  finalOutcome: AuditOutcome;
}

export interface CountResultLine {
  palletCode: string;
  sku: string;
  name: string;
  expectedQty: number;
  countedQty: number;
  /** counted − expected */
  difference: number;
}

/** Response of POST /bins/:code/counts (D-072). */
export interface CountResultResponse {
  auditResultId: number;
  binCode: string;
  autoOutcome: AuditOutcome;
  finalOutcome: AuditOutcome;
  totalExpected: number;
  totalCounted: number;
  /** Σ|counted − expected| / Σ expected, as a ratio (D-052). */
  discrepancyRatio: number;
  countedAt: string;
  lines: CountResultLine[];
  /** Audit-generated ADJUSTMENT movements (only when finalOutcome = FAIL, D-004). */
  adjustmentsCreated: number;
  /** The task marked DONE; null for an ad-hoc count. */
  completedTask: PendingTaskRef | null;
  /** Score before the count; null when the bin was never scored. */
  previousScore: number | null;
  /** The new AUDIT score. */
  newScore: number;
}
