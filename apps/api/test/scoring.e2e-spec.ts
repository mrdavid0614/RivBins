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
});
