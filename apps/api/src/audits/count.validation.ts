// Pure checks for a count submission: the body's shape (400) and whether it still
// matches the bin's current lines (409, D-075).
import type {
  AuditOutcome,
  CountLineInput,
  SubmitCountRequest,
} from '@rivbins/shared';
import { COUNT_CONFIG } from './count.config.js';

const OUTCOMES: readonly AuditOutcome[] = ['PASS', 'FAIL'];

export type ParseResult =
  { ok: true; value: SubmitCountRequest } | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isWholeNumber = (
  value: unknown,
  min: number,
  max: number,
): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;

/** Validates the body of POST /bins/:code/counts. */
export function parseCountRequest(
  body: unknown,
  maxQty: number = COUNT_CONFIG.maxCountedQty,
): ParseResult {
  if (!isRecord(body))
    return { ok: false, error: 'The body must be a JSON object' };

  const { lines, finalOutcome } = body;
  if (!OUTCOMES.includes(finalOutcome as AuditOutcome)) {
    return { ok: false, error: 'finalOutcome must be PASS or FAIL' };
  }
  if (!Array.isArray(lines))
    return { ok: false, error: 'lines must be an array' };

  const parsed: CountLineInput[] = [];
  const seen = new Set<number>();
  for (const [i, line] of lines.entries()) {
    if (
      !isRecord(line) ||
      !isWholeNumber(line.palletItemId, 1, Number.MAX_SAFE_INTEGER) ||
      !isWholeNumber(line.expectedQty, 0, Number.MAX_SAFE_INTEGER) ||
      !isWholeNumber(line.countedQty, 0, maxQty)
    ) {
      return {
        ok: false,
        error: `lines[${i}] needs a palletItemId, an expectedQty, and a countedQty between 0 and ${maxQty}`,
      };
    }
    if (seen.has(line.palletItemId)) {
      return {
        ok: false,
        error: `Line ${line.palletItemId} is counted more than once`,
      };
    }
    seen.add(line.palletItemId);
    parsed.push({
      palletItemId: line.palletItemId,
      expectedQty: line.expectedQty,
      countedQty: line.countedQty,
    });
  }

  return {
    ok: true,
    value: { lines: parsed, finalOutcome: finalOutcome as AuditOutcome },
  };
}

export interface CurrentLine {
  palletItemId: number;
  expectedQty: number;
}

/**
 * Returns why the submitted lines no longer match the bin's current lines (D-075),
 * or null when they match: same lines, same expected quantities. Assumes the
 * submission has no duplicates (parseCountRequest rejects them).
 */
export function findSheetMismatch(
  submitted: readonly CountLineInput[],
  current: readonly CurrentLine[],
): string | null {
  const expectedById = new Map(
    current.map((line) => [line.palletItemId, line.expectedQty]),
  );

  for (const line of submitted) {
    const expected = expectedById.get(line.palletItemId);
    if (expected === undefined) {
      return `Line ${line.palletItemId} is no longer in the bin`;
    }
    if (expected !== line.expectedQty) {
      return `The expected quantity of line ${line.palletItemId} changed from ${line.expectedQty} to ${expected}`;
    }
  }
  if (submitted.length !== current.length) {
    return 'The bin has lines that were not counted';
  }
  return null;
}
