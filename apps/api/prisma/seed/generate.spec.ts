import { generateSeedData, SIMULATED_DAYS, type SeedData } from './generate.js';
import { createRng } from './random.js';

const NOW = new Date('2026-10-03T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });

  it('keeps int() within its inclusive bounds', () => {
    const rng = createRng(7);
    const values = Array.from({ length: 500 }, () => rng.int(2, 4));
    expect(new Set(values)).toEqual(new Set([2, 3, 4]));
  });
});

describe('generateSeedData', () => {
  let data: SeedData;

  beforeAll(() => {
    data = generateSeedData({ now: NOW });
  });

  it('is deterministic for a given seed and now', () => {
    expect(generateSeedData({ now: NOW })).toEqual(data);
    expect(generateSeedData({ now: NOW, seed: 1 })).not.toEqual(data);
  });

  describe('layout', () => {
    it('builds 3 aisles × 2 racks × 6 bins (D-043)', () => {
      expect(data.aisles.map((a) => a.code)).toEqual(['A', 'B', 'C']);
      expect(data.racks).toHaveLength(6);
      expect(data.bins).toHaveLength(36);
    });

    it('gives every bin a unique code in the A-01-03 format', () => {
      const codes = data.bins.map((b) => b.code);
      expect(new Set(codes).size).toBe(codes.length);
      for (const code of codes) expect(code).toMatch(/^[A-C]-0[12]-0[1-6]$/);
      expect(codes).toContain('A-01-01');
      expect(codes).toContain('C-02-06');
    });

    it('places each bin on a unique (rack, level, position) cell', () => {
      const cells = data.bins.map(
        (b) => `${b.rackId}:${b.level}:${b.position}`,
      );
      expect(new Set(cells).size).toBe(cells.length);
    });
  });

  describe('inventory', () => {
    it('gives every pallet at least one product line, without duplicate products', () => {
      for (const pallet of data.pallets) {
        const productIds = data.palletItems
          .filter((item) => item.palletId === pallet.id)
          .map((item) => item.productId);
        expect(productIds.length).toBeGreaterThan(0);
        expect(new Set(productIds).size).toBe(productIds.length);
      }
    });

    it('never leaves a quantity below 1', () => {
      for (const item of data.palletItems)
        expect(item.quantity).toBeGreaterThanOrEqual(1);
    });

    it('leaves no bin empty', () => {
      for (const bin of data.bins) {
        expect(data.pallets.some((p) => p.binId === bin.id)).toBe(true);
      }
    });
  });

  describe('movements', () => {
    it('fall within the last 30 days', () => {
      const start = NOW.getTime() - SIMULATED_DAYS * DAY_MS;
      for (const m of data.movements) {
        expect(m.occurredAt.getTime()).toBeGreaterThanOrEqual(start);
        expect(m.occurredAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
      }
    });

    it('are in chronological order', () => {
      const times = data.movements.map((m) => m.occurredAt.getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it('include every movement type', () => {
      const types = new Set(data.movements.map((m) => m.type));
      expect(types).toEqual(new Set(['PUTAWAY', 'PICK', 'MOVE', 'ADJUSTMENT']));
    });

    it('fill only the fields that belong to each type', () => {
      for (const m of data.movements) {
        const isLineMovement = m.type === 'PICK' || m.type === 'ADJUSTMENT';
        expect(m.productId !== null).toBe(isLineMovement);
        expect(m.quantityDelta !== null).toBe(isLineMovement);
        expect(m.fromBinId !== null).toBe(m.type === 'MOVE');
        if (m.type !== 'ADJUSTMENT') expect(m.auditResultId).toBeNull();
        if (m.type === 'PICK') expect(m.quantityDelta).toBeLessThan(0);
      }
    });

    it('track pallet locations: each MOVE starts where the pallet was', () => {
      const location = new Map<number, number>();
      for (const m of data.movements) {
        if (m.type === 'PUTAWAY') {
          expect(location.has(m.palletId)).toBe(false);
          location.set(m.palletId, m.binId);
        } else if (m.type === 'MOVE') {
          expect(m.fromBinId).toBe(location.get(m.palletId));
          expect(m.binId).not.toBe(m.fromBinId);
          location.set(m.palletId, m.binId);
        } else {
          expect(m.binId).toBe(location.get(m.palletId));
        }
      }
      for (const pallet of data.pallets)
        expect(location.get(pallet.id)).toBe(pallet.binId);
    });

    it('spread activity unevenly across bins', () => {
      const activity = data.bins.map(
        (bin) =>
          data.movements.filter(
            (m) =>
              m.type !== 'ADJUSTMENT' &&
              (m.binId === bin.id || m.fromBinId === bin.id),
          ).length,
      );
      expect(Math.max(...activity)).toBeGreaterThanOrEqual(
        5 * Math.max(1, Math.min(...activity)),
      );
    });
  });

  describe('past audits (D-044)', () => {
    it('include passed and failed audits, and never-audited bins', () => {
      const outcomes = new Set(data.auditResults.map((r) => r.finalOutcome));
      expect(outcomes).toEqual(new Set(['PASS', 'FAIL']));
      expect(data.bins.some((b) => b.lastAuditedAt === null)).toBe(true);
      expect(data.auditResults.every((r) => r.taskId === null)).toBe(true);
    });

    it('compute outcome, totals, and discrepancy ratio from the lines', () => {
      for (const result of data.auditResults) {
        const lines = data.auditResultLines.filter(
          (l) => l.auditResultId === result.id,
        );
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines)
          expect(line.difference).toBe(line.countedQty - line.expectedQty);

        const expected = lines.reduce((t, l) => t + l.expectedQty, 0);
        const counted = lines.reduce((t, l) => t + l.countedQty, 0);
        const absDiff = lines.reduce((t, l) => t + Math.abs(l.difference), 0);
        expect(result.totalExpected).toBe(expected);
        expect(result.totalCounted).toBe(counted);
        expect(result.discrepancyRatio).toBeCloseTo(absDiff / expected, 10);
        expect(result.autoOutcome).toBe(absDiff === 0 ? 'PASS' : 'FAIL');
        expect(result.finalOutcome).toBe(result.autoOutcome);
      }
    });

    it('count every pallet line in the bin at count time', () => {
      for (const result of data.auditResults) {
        const lines = data.auditResultLines.filter(
          (l) => l.auditResultId === result.id,
        );
        const location = new Map<number, number>();
        for (const m of data.movements) {
          if (m.occurredAt > result.countedAt) break;
          if (m.type === 'PUTAWAY' || m.type === 'MOVE')
            location.set(m.palletId, m.binId);
        }
        const palletsInBin = [...location].filter(
          ([, binId]) => binId === result.binId,
        );
        expect(new Set(lines.map((l) => l.palletId))).toEqual(
          new Set(palletsInBin.map(([palletId]) => palletId)),
        );
      }
    });

    it('create one audit adjustment per mismatched line, only for failed audits (D-004)', () => {
      const adjustments = data.movements.filter(
        (m) => m.auditResultId !== null,
      );
      for (const result of data.auditResults) {
        const mismatched = data.auditResultLines.filter(
          (l) => l.auditResultId === result.id && l.difference !== 0,
        );
        const own = adjustments.filter((m) => m.auditResultId === result.id);
        if (result.finalOutcome === 'PASS') {
          expect(own).toHaveLength(0);
          continue;
        }
        expect(own).toHaveLength(mismatched.length);
        for (const line of mismatched) {
          const adjustment = own.find(
            (m) =>
              m.palletId === line.palletId && m.productId === line.productId,
          );
          expect(adjustment).toMatchObject({
            type: 'ADJUSTMENT',
            binId: result.binId,
            quantityDelta: line.difference,
            occurredAt: result.countedAt,
          });
        }
      }
    });

    it("set each bin's lastAuditedAt to its latest audit", () => {
      for (const bin of data.bins) {
        const times = data.auditResults
          .filter((r) => r.binId === bin.id)
          .map((r) => r.countedAt.getTime());
        expect(bin.lastAuditedAt?.getTime() ?? null).toBe(
          times.length ? Math.max(...times) : null,
        );
      }
    });

    it('keep quantities consistent: counted value plus later deltas equals the final quantity', () => {
      const lastLineAudit = new Map<
        string,
        { countedQty: number; countedAt: Date }
      >();
      for (const result of data.auditResults) {
        for (const line of data.auditResultLines.filter(
          (l) => l.auditResultId === result.id,
        )) {
          // After a PASS the system keeps the expected value; after a FAIL, the counted one.
          const qtyAfter =
            result.finalOutcome === 'FAIL' ? line.countedQty : line.expectedQty;
          lastLineAudit.set(`${line.palletId}:${line.productId}`, {
            countedQty: qtyAfter,
            countedAt: result.countedAt,
          });
        }
      }
      expect(lastLineAudit.size).toBeGreaterThan(0);

      for (const [key, snapshot] of lastLineAudit) {
        const [palletId, productId] = key.split(':').map(Number);
        const laterDeltas = data.movements
          .filter(
            (m) =>
              m.palletId === palletId &&
              m.productId === productId &&
              m.occurredAt > snapshot.countedAt,
          )
          .reduce((t, m) => t + (m.quantityDelta ?? 0), 0);
        const item = data.palletItems.find(
          (i) => i.palletId === palletId && i.productId === productId,
        );
        expect(item?.quantity).toBe(snapshot.countedQty + laterDeltas);
      }
    });
  });
});
