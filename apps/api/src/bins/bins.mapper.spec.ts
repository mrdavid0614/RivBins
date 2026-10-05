import { toBinDetail, toScoreHistoryEntry, type BinDetailRow } from './bins.mapper.js';

const factors = [
  {
    key: 'skuMix',
    label: 'Distinct SKUs in bin',
    rawValue: 3,
    threshold: 6,
    normalized: 0.4,
    weight: 0.1,
    points: 4,
  },
];

const row: BinDetailRow = {
  id: 7,
  code: 'A-01-03',
  level: 1,
  position: 3,
  lastAuditedAt: null,
  rack: { code: '01', aisle: { code: 'A' } },
  currentScore: {
    id: 40,
    score: 4,
    trigger: 'SEED',
    auditResultId: null,
    computedAt: new Date('2026-10-04T08:00:00Z'),
    factors,
  },
  tasks: [],
  pallets: [
    {
      code: 'PLT-0002',
      items: [
        { quantity: 5, product: { sku: 'SKU-B', name: 'Bolts' } },
        { quantity: 0, product: { sku: 'SKU-C', name: 'Clips' } },
        { quantity: 12, product: { sku: 'SKU-A', name: 'Anchors' } },
      ],
    },
    { code: 'PLT-0001', items: [] },
  ],
};

describe('toBinDetail', () => {
  it('exposes the pending task, or null without one', () => {
    expect(toBinDetail(row).pendingTask).toBeNull();
    const task = { id: 3, planId: 1, rank: 2 };
    expect(toBinDetail({ ...row, tasks: [task] }).pendingTask).toEqual(task);
  });

  it('maps location, last audit, and the stored breakdown as is', () => {
    const detail = toBinDetail(row);
    expect(detail).toMatchObject({
      id: 7,
      code: 'A-01-03',
      aisle: 'A',
      rack: '01',
      level: 1,
      position: 3,
      lastAuditedAt: null,
      currentScore: {
        score: 4,
        trigger: 'SEED',
        computedAt: '2026-10-04T08:00:00.000Z',
        factors,
      },
    });
  });

  it('sorts pallets and lines and hides lines with quantity 0 (D-065)', () => {
    const { pallets } = toBinDetail(row);
    expect(pallets.map((p) => p.code)).toEqual(['PLT-0001', 'PLT-0002']);
    expect(pallets[1]?.items).toEqual([
      { sku: 'SKU-A', name: 'Anchors', quantity: 12 },
      { sku: 'SKU-B', name: 'Bolts', quantity: 5 },
    ]);
  });

  it('returns a null current score for an unscored bin', () => {
    const detail = toBinDetail({
      ...row,
      lastAuditedAt: new Date('2026-09-01T00:00:00Z'),
      currentScore: null,
    });
    expect(detail.currentScore).toBeNull();
    expect(detail.lastAuditedAt).toBe('2026-09-01T00:00:00.000Z');
  });
});

describe('toScoreHistoryEntry', () => {
  it('serializes the timestamp and keeps the audit link', () => {
    expect(
      toScoreHistoryEntry({
        id: 3,
        score: 22,
        trigger: 'AUDIT',
        auditResultId: 14,
        computedAt: new Date('2026-10-04T09:30:00Z'),
      }),
    ).toEqual({
      id: 3,
      score: 22,
      trigger: 'AUDIT',
      auditResultId: 14,
      computedAt: '2026-10-04T09:30:00.000Z',
    });
  });
});
