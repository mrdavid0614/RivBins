// Requires a seeded database: run `pnpm db:up`, `pnpm db:migrate`, and `pnpm db:seed`.
// Only appends score rows; it never deletes data.
import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { FactorBreakdown, RecomputeScoresResponse } from '@rivbins/shared';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Scoring (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /scoring/recompute appends a new current score for every bin', async () => {
    const binCount = await prisma.bin.count();
    expect(binCount).toBeGreaterThan(0); // the database must be seeded
    const rowsBefore = await prisma.binScore.count();
    const previousIds = (
      await prisma.bin.findMany({ select: { currentScoreId: true } })
    ).map((b) => b.currentScoreId);

    const res = await request(app.getHttpServer())
      .post('/scoring/recompute')
      .expect(201);
    const body = res.body as RecomputeScoresResponse;

    expect(body).toMatchObject({
      trigger: 'MANUAL_RECOMPUTE',
      binsRecomputed: binCount,
    });
    expect(await prisma.binScore.count()).toBe(rowsBefore + binCount);

    const bins = await prisma.bin.findMany({ include: { currentScore: true } });
    for (const bin of bins) {
      const current = bin.currentScore;
      expect(current).not.toBeNull();
      expect(previousIds).not.toContain(current?.id);
      expect(current?.trigger).toBe('MANUAL_RECOMPUTE');
      expect(current?.computedAt.toISOString()).toBe(body.computedAt);
      expect(current?.score).toBeGreaterThanOrEqual(0);
      expect(current?.score).toBeLessThanOrEqual(100);

      const factors = current?.factors as unknown as FactorBreakdown[];
      expect(factors).toHaveLength(6);
      const points = factors.reduce((sum, f) => sum + f.points, 0);
      expect(Math.abs(points - (current?.score ?? 0))).toBeLessThan(1);
    }
  });

  it('waits for a concurrent count and scores the counted state', async () => {
    const bin = await prisma.bin.findFirstOrThrow({
      where: { lastAuditedAt: null },
      orderBy: { id: 'asc' },
      select: { id: true, lastAuditedAt: true },
    });

    let auditId: number | undefined;
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    let locked = (): void => {};
    const lockTaken = new Promise<void>((resolve) => (locked = resolve));

    try {
      // Stands in for the count flow: it updates the bin first (D-056), which
      // locks the row. Once the gate opens, after the recompute has started and
      // is waiting, it saves a failed audit and commits.
      const count = prisma.$transaction(async (tx) => {
        await tx.bin.update({
          where: { id: bin.id },
          data: { lastAuditedAt: new Date() },
        });
        locked();
        await gate;
        const audit = await tx.auditResult.create({
          data: {
            binId: bin.id,
            autoOutcome: 'FAIL',
            finalOutcome: 'FAIL',
            totalExpected: 100,
            totalCounted: 75,
            discrepancyRatio: 0.25,
            countedAt: new Date(),
          },
          select: { id: true },
        });
        auditId = audit.id;
      });
      await lockTaken;

      let finished = false;
      const recompute = request(app.getHttpServer())
        .post('/scoring/recompute')
        .then((res) => {
          finished = true;
          return res;
        });

      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(finished).toBe(false); // blocked on the bin lock

      release();
      await count;
      expect((await recompute).status).toBe(201);

      const current = await prisma.bin.findUniqueOrThrow({
        where: { id: bin.id },
        include: { currentScore: true },
      });
      const factors = current.currentScore?.factors as unknown as FactorBreakdown[];
      const raw = (key: string) => factors.find((f) => f.key === key)?.rawValue;
      expect(raw('timeSinceLastAudit')).toBe(0); // not "never audited"
      // The audit committed while the recompute waited is in factors 4 and 5 (D-057).
      expect(raw('auditFailureHistory')).toBe(1);
      expect(raw('lastDiscrepancySize')).toBe(0.25);
    } finally {
      release();
      // Undo the simulated count: its audit, the bin's audit date, and its score.
      if (auditId !== undefined) {
        await prisma.auditResult.delete({ where: { id: auditId } });
      }
      await prisma.bin.update({
        where: { id: bin.id },
        data: { lastAuditedAt: bin.lastAuditedAt },
      });
      await request(app.getHttpServer()).post('/scoring/recompute').expect(201);
    }
  });
});
