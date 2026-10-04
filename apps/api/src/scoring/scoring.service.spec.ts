import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScoringService } from './scoring.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function createTx() {
  return {
    bin: {
      findMany: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    movement: { findMany: vi.fn().mockResolvedValue([]) },
    auditResult: {
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockResolvedValue([]),
    },
    palletItem: { findMany: vi.fn().mockResolvedValue([]) },
    binScore: {
      create: vi.fn().mockImplementation(({ data }: { data: { binId: number } }) =>
        Promise.resolve({ id: 1000 + data.binId }),
      ),
    },
  };
}

describe('ScoringService', () => {
  let tx: ReturnType<typeof createTx>;
  let transaction: ReturnType<typeof vi.fn>;
  let service: ScoringService;

  beforeEach(async () => {
    tx = createTx();
    transaction = vi.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
    const moduleRef = await Test.createTestingModule({
      providers: [
        ScoringService,
        { provide: PrismaService, useValue: { $transaction: transaction } },
      ],
    }).compile();
    service = moduleRef.get(ScoringService);
  });

  describe('recomputeAll', () => {
    it('appends a MANUAL_RECOMPUTE row per bin and repoints currentScoreId in one transaction', async () => {
      tx.bin.findMany
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]) // all bins
        .mockResolvedValueOnce([
          { id: 1, lastAuditedAt: null },
          { id: 2, lastAuditedAt: new Date() },
        ]);

      const result = await service.recomputeAll();

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ trigger: 'MANUAL_RECOMPUTE', binsRecomputed: 2 });

      const creates = tx.binScore.create.mock.calls.map(([arg]) => arg.data);
      expect(creates).toHaveLength(2);
      for (const data of creates) {
        expect(data.trigger).toBe('MANUAL_RECOMPUTE');
        expect(data.auditResultId).toBeNull();
        expect(data.computedAt.toISOString()).toBe(result.computedAt);
        expect(data.factors).toHaveLength(6);
      }
      // Never audited: factor 1 maxed → 25 points.
      expect(creates.find((d) => d.binId === 1)?.score).toBe(25);

      expect(tx.bin.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { currentScoreId: 1001 },
      });
      expect(tx.bin.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { currentScoreId: 1002 },
      });
    });

    it('scores movements only since the last audit, excluding audit adjustments', async () => {
      const lastAuditedAt = new Date(Date.now() - 2 * DAY_MS);
      const before = new Date(lastAuditedAt.getTime() - DAY_MS);
      const after = new Date(lastAuditedAt.getTime() + DAY_MS);
      tx.bin.findMany
        .mockResolvedValueOnce([{ id: 1 }])
        .mockResolvedValueOnce([{ id: 1, lastAuditedAt }]);
      const move = { auditResultId: null, fromBinId: null };
      tx.movement.findMany.mockResolvedValue([
        { ...move, type: 'PICK', binId: 1, occurredAt: before }, // verified by audit
        { ...move, type: 'PICK', binId: 1, occurredAt: after },
        { ...move, type: 'MOVE', binId: 9, fromBinId: 1, occurredAt: after }, // out
        { ...move, type: 'ADJUSTMENT', binId: 1, occurredAt: after }, // manual
        { ...move, type: 'ADJUSTMENT', binId: 1, auditResultId: 5, occurredAt: after },
      ]);

      await service.recomputeAll();

      const factors = tx.binScore.create.mock.calls[0]?.[0].data.factors as {
        key: string;
        rawValue: number;
      }[];
      const raw = (key: string) => factors.find((f) => f.key === key)?.rawValue;
      expect(raw('activitySinceLastAudit')).toBe(2);
      expect(raw('adjustmentsSinceLastAudit')).toBe(1);
    });
  });

  describe('recomputeBin', () => {
    beforeEach(() => {
      tx.bin.findMany.mockResolvedValue([{ id: 7, lastAuditedAt: new Date() }]);
    });

    it('stores an AUDIT row with its auditResultId', async () => {
      await service.recomputeBin(7, 'AUDIT', 42);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(tx.binScore.create).toHaveBeenCalledTimes(1);
      expect(tx.binScore.create.mock.calls[0]?.[0].data).toMatchObject({
        binId: 7,
        trigger: 'AUDIT',
        auditResultId: 42,
      });
      expect(tx.bin.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { currentScoreId: 1007 },
      });
    });

    it("reuses the caller's transaction", async () => {
      await service.recomputeBin(7, 'AUDIT', 42, tx as never);

      expect(transaction).not.toHaveBeenCalled();
      expect(tx.binScore.create).toHaveBeenCalledTimes(1);
    });

    it('rejects an AUDIT recompute without an auditResultId', async () => {
      await expect(service.recomputeBin(7, 'AUDIT')).rejects.toThrow(/auditResultId/);
      expect(tx.binScore.create).not.toHaveBeenCalled();
    });

    it('throws 404 for an unknown bin', async () => {
      tx.bin.findMany.mockResolvedValue([]);
      await expect(service.recomputeBin(99, 'MANUAL_RECOMPUTE')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
