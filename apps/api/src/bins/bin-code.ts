/** Bin codes are matched case-insensitively, so typed or scanned codes both work. */
export const normalizeBinCode = (code: string): string =>
  code.trim().toUpperCase();
