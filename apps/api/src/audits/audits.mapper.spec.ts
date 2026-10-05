import {
  toCountResult,
  toCountSheet,
  type SavedLine,
} from './audits.mapper.js';
import { evaluateCount } from './count.evaluation.js';

const item = (id: number, sku: string, quantity: number) => ({
  id,
  quantity,
  product: { id: id * 10, sku, name: `Product ${sku}` },
});

describe('toCountSheet', () => {
  it('sorts pallets and lines, and skips lines and pallets with no stock (D-073)', () => {
    const sheet = toCountSheet(
      {
        id: 5,
        code: 'A-01-03',
        lastAuditedAt: new Date('2026-10-01T00:00:00Z'),
        currentScore: { score: 71 },
        tasks: [{ id: 9, planId: 2, rank: 1 }],
        pallets: [
          {
            code: 'PLT-0002',
            items: [item(3, 'SKU-B', 4), item(2, 'SKU-A', 0)],
          },
          {
            code: 'PLT-0001',
            items: [item(1, 'SKU-C', 6), item(4, 'SKU-A', 2)],
          },
          { code: 'PLT-0003', items: [item(5, 'SKU-D', 0)] },
        ],
      },
      0,
    );

    expect(sheet).toEqual({
      binId: 5,
      code: 'A-01-03',
      lastAuditedAt: '2026-10-01T00:00:00.000Z',
      currentScore: 71,
      pendingTask: { id: 9, planId: 2, rank: 1 },
      toleranceUnits: 0,
      pallets: [
        {
          code: 'PLT-0001',
          lines: [
            {
              palletItemId: 4,
              sku: 'SKU-A',
              name: 'Product SKU-A',
              expectedQty: 2,
            },
            {
              palletItemId: 1,
              sku: 'SKU-C',
              name: 'Product SKU-C',
              expectedQty: 6,
            },
          ],
        },
        {
          code: 'PLT-0002',
          lines: [
            {
              palletItemId: 3,
              sku: 'SKU-B',
              name: 'Product SKU-B',
              expectedQty: 4,
            },
          ],
        },
      ],
    });
  });

  it('maps a never-audited, unscored bin without a task', () => {
    const sheet = toCountSheet(
      {
        id: 1,
        code: 'B-02-01',
        lastAuditedAt: null,
        currentScore: null,
        tasks: [],
        pallets: [],
      },
      2,
    );
    expect(sheet).toMatchObject({
      lastAuditedAt: null,
      currentScore: null,
      pendingTask: null,
      toleranceUnits: 2,
      pallets: [],
    });
  });
});

describe('toCountResult', () => {
  it('maps the evaluation and the scores', () => {
    const line: SavedLine = {
      palletItemId: 1,
      palletId: 2,
      palletCode: 'PLT-0001',
      productId: 3,
      sku: 'SKU-A',
      name: 'Product A',
      expectedQty: 10,
      countedQty: 8,
    };
    const result = toCountResult({
      auditResultId: 42,
      binCode: 'A-01-03',
      finalOutcome: 'FAIL',
      countedAt: new Date('2026-10-05T12:00:00Z'),
      evaluation: evaluateCount([line], 0),
      adjustmentsCreated: 1,
      completedTask: null,
      previousScore: 80,
      newScore: 35,
    });

    expect(result).toEqual({
      auditResultId: 42,
      binCode: 'A-01-03',
      autoOutcome: 'FAIL',
      finalOutcome: 'FAIL',
      totalExpected: 10,
      totalCounted: 8,
      discrepancyRatio: 0.2,
      countedAt: '2026-10-05T12:00:00.000Z',
      lines: [
        {
          palletCode: 'PLT-0001',
          sku: 'SKU-A',
          name: 'Product A',
          expectedQty: 10,
          countedQty: 8,
          difference: -2,
        },
      ],
      adjustmentsCreated: 1,
      completedTask: null,
      previousScore: 80,
      newScore: 35,
    });
  });
});
