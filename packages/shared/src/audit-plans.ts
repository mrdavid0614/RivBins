import type { TaskStatus } from './enums.js';

// Dates are ISO 8601 strings: the API serializes them with JSON.

/** Body of POST /audit-plans: N must be between 1 and the eligible bins (D-069). */
export interface CreateAuditPlanRequest {
  n: number;
}

/** Response of GET /audit-plans/eligibility (D-069). */
export interface AuditPlanEligibility {
  /** Scored bins without a PENDING task: the largest N a plan can request. */
  eligibleBins: number;
}

/** One row of the tasks table (GET /audit-tasks). */
export interface AuditTaskRow {
  id: number;
  planId: number;
  /** 1 = riskiest bin in its plan. */
  rank: number;
  binCode: string;
  /** Snapshot taken when the plan was created. */
  scoreAtCreation: number;
  /** The bin's score now; null when it was never scored. */
  currentScore: number | null;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
}

/** Response of POST /audit-plans (D-067). */
export interface AuditPlanResponse {
  id: number;
  requestedN: number;
  createdAt: string;
  /** Ordered by rank. */
  tasks: AuditTaskRow[];
}

/** One row of GET /audit-plans, newest first. */
export interface AuditPlanSummary {
  id: number;
  requestedN: number;
  createdAt: string;
  taskCount: number;
  pendingCount: number;
  doneCount: number;
}

/** A bin's open task, shown as a badge on the heatmap and in the bin drawer. */
export interface PendingTaskRef {
  id: number;
  planId: number;
  rank: number;
}
