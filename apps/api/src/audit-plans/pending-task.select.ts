// Selects a bin's PENDING task (at most one, enforced by "AuditTask_binId_pending_key")
// for the heatmap and bin detail badges.
export const PENDING_TASK_SELECT = {
  where: { status: 'PENDING' },
  select: { id: true, planId: true, rank: true },
  take: 1,
} as const;
