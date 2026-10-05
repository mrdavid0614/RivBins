import {
  isValidPlanSize,
  selectTopBins,
  type PlanCandidate,
} from './audit-plans.selection.js';

const bin = (binId: number, code: string, score: number): PlanCandidate => ({
  binId,
  code,
  score,
});

describe('selectTopBins', () => {
  const candidates = [
    bin(1, 'A-01-01', 40),
    bin(2, 'A-01-02', 90),
    bin(3, 'B-01-01', 65),
    bin(4, 'C-02-03', 12),
  ];

  it('picks the n highest scores, riskiest first', () => {
    expect(selectTopBins(candidates, 2).map((b) => b.binId)).toEqual([2, 3]);
  });

  it('breaks ties by bin code', () => {
    const tied = [
      bin(1, 'B-01-01', 50),
      bin(2, 'A-02-01', 50),
      bin(3, 'A-01-01', 50),
    ];
    expect(selectTopBins(tied, 3).map((b) => b.code)).toEqual([
      'A-01-01',
      'A-02-01',
      'B-01-01',
    ]);
  });

  it('returns every candidate when n exceeds them', () => {
    expect(selectTopBins(candidates, 10)).toHaveLength(4);
  });

  it('returns nothing for an empty list or a non-positive n', () => {
    expect(selectTopBins([], 3)).toEqual([]);
    expect(selectTopBins(candidates, 0)).toEqual([]);
  });

  it('does not reorder the input', () => {
    const input = [...candidates];
    selectTopBins(input, 2);
    expect(input).toEqual(candidates);
  });
});

describe('isValidPlanSize', () => {
  it.each([1, 5, 36])('accepts %s', (n) => {
    expect(isValidPlanSize(n)).toBe(true);
  });

  it.each([0, -1, 2.5, Number.NaN, '3', null, undefined])('rejects %s', (n) => {
    expect(isValidPlanSize(n)).toBe(false);
  });
});
