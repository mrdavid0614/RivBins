import { toWarehouseLayout, type LayoutRow } from './warehouse.mapper.js';

const bin = (
  id: number,
  level: number,
  position: number,
  score: number | null,
): LayoutRow['aisles'][number]['racks'][number]['bins'][number] => ({
  id,
  code: `B-${id}`,
  level,
  position,
  lastAuditedAt: id === 1 ? new Date('2026-09-20T10:00:00Z') : null,
  currentScore:
    score === null ? null : { score, computedAt: new Date('2026-10-04T00:00:00Z') },
  tasks: id === 1 ? [{ id: 5, planId: 2, rank: 1 }] : [],
});

describe('toWarehouseLayout', () => {
  const row: LayoutRow = {
    code: 'WH1',
    name: 'Main',
    aisles: [
      {
        code: 'B',
        position: 2,
        racks: [{ code: '01', position: 1, bins: [bin(9, 1, 1, 10)] }],
      },
      {
        code: 'A',
        position: 1,
        racks: [
          { code: '02', position: 2, bins: [] },
          {
            code: '01',
            position: 1,
            bins: [bin(2, 1, 2, 50), bin(1, 1, 1, 80), bin(3, 2, 3, null)],
          },
        ],
      },
    ],
  };

  it('sorts aisles and racks by position', () => {
    const layout = toWarehouseLayout(row);
    expect(layout.warehouse).toEqual({ code: 'WH1', name: 'Main' });
    expect(layout.aisles.map((a) => a.code)).toEqual(['A', 'B']);
    expect(layout.aisles[0]?.racks.map((r) => r.code)).toEqual(['01', '02']);
  });

  it('orders bins top shelf first, then by position', () => {
    const rack = toWarehouseLayout(row).aisles[0]?.racks[0];
    expect(rack?.bins.map((b) => b.id)).toEqual([3, 1, 2]);
  });

  it('sizes the grid from the highest level and position', () => {
    const [full, empty] = toWarehouseLayout(row).aisles[0]?.racks ?? [];
    expect(full).toMatchObject({ levels: 2, positions: 3 });
    expect(empty).toMatchObject({ levels: 0, positions: 0, bins: [] });
  });

  it('flattens the current score and serializes dates', () => {
    const [unscored, scored] = toWarehouseLayout(row).aisles[0]?.racks[0]?.bins ?? [];
    expect(scored).toEqual({
      id: 1,
      code: 'B-1',
      level: 1,
      position: 1,
      score: 80,
      scoreComputedAt: '2026-10-04T00:00:00.000Z',
      lastAuditedAt: '2026-09-20T10:00:00.000Z',
      pendingTask: { id: 5, planId: 2, rank: 1 },
    });
    expect(unscored).toMatchObject({
      score: null,
      scoreComputedAt: null,
      lastAuditedAt: null,
      pendingTask: null,
    });
  });
});
