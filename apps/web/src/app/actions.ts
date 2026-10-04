'use server';

import type { RecomputeScoresResponse } from '@rivbins/shared';
import { refresh } from 'next/cache';
import { apiFetch } from '@/lib/api';

export type RecomputeState =
  | { status: 'idle' }
  | { status: 'done'; binsRecomputed: number; computedAt: string }
  | { status: 'error'; message: string };

/** "Recompute scores": rescores every bin, then refreshes the heatmap (D-053). */
export async function recomputeScores(): Promise<RecomputeState> {
  try {
    const result = await apiFetch<RecomputeScoresResponse>('/scoring/recompute', {
      method: 'POST',
    });
    refresh();
    return {
      status: 'done',
      binsRecomputed: result.binsRecomputed,
      computedAt: result.computedAt,
    };
  } catch {
    return { status: 'error', message: 'Recompute failed. Is the API running?' };
  }
}
