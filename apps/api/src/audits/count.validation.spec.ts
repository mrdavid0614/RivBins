import { findSheetMismatch, parseCountRequest } from './count.validation.js';

const first = { palletItemId: 1, expectedQty: 10, countedQty: 9 };
const second = { palletItemId: 2, expectedQty: 4, countedQty: 4 };
const valid = { finalOutcome: 'FAIL', lines: [first, second] };

describe('parseCountRequest', () => {
  it('accepts a valid body and drops unknown fields', () => {
    const result = parseCountRequest({
      ...valid,
      extra: true,
      lines: [{ ...first, note: 'x' }],
    });
    expect(result).toEqual({
      ok: true,
      value: { finalOutcome: 'FAIL', lines: [first] },
    });
  });

  it('accepts an empty bin', () => {
    expect(parseCountRequest({ finalOutcome: 'PASS', lines: [] }).ok).toBe(
      true,
    );
  });

  it.each([
    ['a non-object body', null],
    ['an array body', []],
    ['a missing outcome', { lines: [] }],
    ['a lowercase outcome', { finalOutcome: 'pass', lines: [] }],
    ['lines that are not an array', { finalOutcome: 'PASS', lines: {} }],
    [
      'a negative count',
      {
        ...valid,
        lines: [{ palletItemId: 1, expectedQty: 1, countedQty: -1 }],
      },
    ],
    [
      'a fractional count',
      {
        ...valid,
        lines: [{ palletItemId: 1, expectedQty: 1, countedQty: 1.5 }],
      },
    ],
    [
      'a string count',
      {
        ...valid,
        lines: [{ palletItemId: 1, expectedQty: 1, countedQty: '1' }],
      },
    ],
    [
      'a count above the cap',
      {
        ...valid,
        lines: [{ palletItemId: 1, expectedQty: 1, countedQty: 101 }],
      },
    ],
    [
      'a missing palletItemId',
      { ...valid, lines: [{ expectedQty: 1, countedQty: 1 }] },
    ],
    [
      'a missing expectedQty',
      { ...valid, lines: [{ palletItemId: 1, countedQty: 1 }] },
    ],
    ['a repeated line', { ...valid, lines: [first, first] }],
  ])('rejects %s', (_label, body) => {
    expect(parseCountRequest(body, 100).ok).toBe(false);
  });
});

describe('findSheetMismatch', () => {
  const currentFirst = { palletItemId: 1, expectedQty: 10 };
  const current = [currentFirst, { palletItemId: 2, expectedQty: 4 }];

  it('returns null when the lines match', () => {
    expect(findSheetMismatch(valid.lines, current)).toBeNull();
    expect(findSheetMismatch([], [])).toBeNull();
  });

  it('flags a line that left the bin', () => {
    expect(
      findSheetMismatch(
        [...valid.lines, { palletItemId: 3, expectedQty: 1, countedQty: 1 }],
        current,
      ),
    ).toMatch(/line 3 is no longer in the bin/i);
  });

  it('flags a changed expected quantity', () => {
    expect(
      findSheetMismatch(valid.lines, [
        currentFirst,
        { palletItemId: 2, expectedQty: 6 },
      ]),
    ).toMatch(/changed from 4 to 6/);
  });

  it('flags a line that was not counted', () => {
    expect(findSheetMismatch([first], current)).toMatch(/not counted/);
  });
});
