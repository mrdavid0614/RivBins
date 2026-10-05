// Single source of truth for the count rules (CLAUDE.md "Count Logic", D-002).

export interface CountConfig {
  /** A line passes when |counted − expected| ≤ this many units. 0 = exact match. */
  toleranceUnits: number;
  /** Sanity cap on a counted quantity (fits the Postgres int column). */
  maxCountedQty: number;
}

export const COUNT_CONFIG: CountConfig = {
  toleranceUnits: 0,
  maxCountedQty: 1_000_000,
};

/** Throws if the tolerance or the cap is not a whole number of units. */
export function assertValidCountConfig(config: CountConfig): void {
  if (!Number.isInteger(config.toleranceUnits) || config.toleranceUnits < 0) {
    throw new Error('toleranceUnits must be a whole number of at least 0');
  }
  if (!Number.isInteger(config.maxCountedQty) || config.maxCountedQty < 1) {
    throw new Error('maxCountedQty must be a whole number of at least 1');
  }
}

assertValidCountConfig(COUNT_CONFIG);
