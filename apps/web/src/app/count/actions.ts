'use server';

import type {
  AuditTaskRow,
  CountResultResponse,
  SubmitCountRequest,
} from '@rivbins/shared';
import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api';

/** Bin search: typed or scanned with a keyboard scanner (D-074). */
export async function openBin(formData: FormData): Promise<void> {
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  redirect(code ? `/count/${encodeURIComponent(code)}` : '/count');
}

export type SaveCountState =
  | { status: 'idle' }
  | { status: 'done'; result: CountResultResponse; nextTaskBinCode: string | null }
  | { status: 'stale'; message: string }
  | { status: 'error'; message: string };

/** Saves a count (D-072). The API decides the auto outcome again with the current data. */
export async function saveCount(
  binCode: string,
  body: SubmitCountRequest,
): Promise<SaveCountState> {
  let result: CountResultResponse;
  try {
    result = await apiFetch<CountResultResponse>(
      `/bins/${encodeURIComponent(binCode)}/counts`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return { status: 'stale', message: error.message };
    }
    if (error instanceof ApiError && (error.status === 400 || error.status === 404)) {
      return { status: 'error', message: error.message };
    }
    return { status: 'error', message: 'Could not save the count. Is the API running?' };
  }

  return { status: 'done', result, nextTaskBinCode: await nextPendingBin() };
}

/** The first pending task in the tasks table order (newest plan, then rank). */
async function nextPendingBin(): Promise<string | null> {
  try {
    const [next] = await apiFetch<AuditTaskRow[]>('/audit-tasks?status=PENDING&limit=1');
    return next?.binCode ?? null;
  } catch {
    return null;
  }
}
