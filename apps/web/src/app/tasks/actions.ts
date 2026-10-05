'use server';

import type { AuditPlanResponse, CreateAuditPlanRequest } from '@rivbins/shared';
import { refresh } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api';

export type GeneratePlanState =
  | { status: 'idle' }
  | { status: 'done'; planId: number; taskCount: number }
  | { status: 'error'; message: string };

/** "Generate audit plan": Top N eligible bins (D-006, D-067), then refreshes the tasks table. */
export async function generateAuditPlan(
  _previous: GeneratePlanState,
  formData: FormData,
): Promise<GeneratePlanState> {
  const n = Number(formData.get('n'));
  if (!Number.isInteger(n) || n < 1) {
    return { status: 'error', message: 'Enter a whole number of at least 1.' };
  }

  try {
    const body: CreateAuditPlanRequest = { n };
    const plan = await apiFetch<AuditPlanResponse>('/audit-plans', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    refresh();
    return { status: 'done', planId: plan.id, taskCount: plan.tasks.length };
  } catch (error) {
    // 400 (N above the eligible bins, D-069) and 409 (none eligible, D-068) explain themselves.
    if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
      return { status: 'error', message: error.message };
    }
    return { status: 'error', message: 'Could not create the plan. Is the API running?' };
  }
}
