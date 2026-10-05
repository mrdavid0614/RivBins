import { evaluateCount } from './count.evaluation.js';

const line = (expectedQty: number, countedQty: number) => ({
  expectedQty,
  countedQty,
});

describe('evaluateCount', () => {
  it('passes when every line matches exactly', () => {
    const result = evaluateCount([line(10, 10), line(4, 4)], 0);
    expect(result.autoOutcome).toBe('PASS');
    expect(result.totalExpected).toBe(14);
    expect(result.totalCounted).toBe(14);
    expect(result.discrepancyRatio).toBe(0);
    expect(result.lines.map((l) => l.difference)).toEqual([0, 0]);
  });

  it('fails when a single line is off', () => {
    const result = evaluateCount([line(10, 10), line(4, 3)], 0);
    expect(result.autoOutcome).toBe('FAIL');
    expect(result.lines[1]).toMatchObject({
      difference: -1,
      withinTolerance: false,
    });
  });

  it('applies the tolerance per line', () => {
    expect(evaluateCount([line(10, 12), line(5, 4)], 2).autoOutcome).toBe(
      'PASS',
    );
    expect(evaluateCount([line(10, 13)], 2).autoOutcome).toBe('FAIL');
  });

  it('keeps errors on different lines from cancelling out', () => {
    // +5 on one line and −5 on the other: totals match, the bin still fails.
    const result = evaluateCount([line(20, 25), line(30, 25)], 0);
    expect(result.totalCounted).toBe(result.totalExpected);
    expect(result.autoOutcome).toBe('FAIL');
    expect(result.discrepancyRatio).toBeCloseTo(10 / 50, 10);
  });

  it('passes an empty bin with no discrepancy (D-076)', () => {
    const result = evaluateCount([], 0);
    expect(result).toEqual({
      lines: [],
      autoOutcome: 'PASS',
      totalExpected: 0,
      totalCounted: 0,
      discrepancyRatio: 0,
    });
  });

  it('keeps the extra fields of each line', () => {
    const result = evaluateCount([{ id: 7, expectedQty: 3, countedQty: 1 }], 0);
    expect(result.lines[0]).toEqual({
      id: 7,
      expectedQty: 3,
      countedQty: 1,
      difference: -2,
      withinTolerance: false,
    });
  });
});
