import type { AuditOutcome } from '@rivbins/shared';

export function OutcomeBadge({ outcome }: { outcome: AuditOutcome }) {
  return outcome === 'PASS' ? (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
      Pass
    </span>
  ) : (
    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">
      Fail
    </span>
  );
}
