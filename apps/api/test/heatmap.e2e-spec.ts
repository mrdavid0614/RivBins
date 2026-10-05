// Requires a seeded database: run `pnpm db:up`, `pnpm db:migrate`, and `pnpm db:seed`.
// Read-only: these endpoints never write.
import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  BinDetailResponse,
  ScoreHistoryEntry,
  WarehouseLayoutResponse,
} from '@rivbins/shared';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Heatmap and bin detail (e2e)', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string) => request(app.getHttpServer()).get(path);

  it('GET /warehouse/layout returns the seeded 3 × 2 racks of 2 × 3 bins (D-043)', async () => {
    const res = await get('/warehouse/layout').expect(200);
    const layout = res.body as WarehouseLayoutResponse;

    expect(layout.aisles.map((a) => a.code)).toEqual(['A', 'B', 'C']);
    const racks = layout.aisles.flatMap((a) => a.racks);
    expect(racks).toHaveLength(6);
    for (const rack of racks) {
      expect(rack).toMatchObject({ levels: 2, positions: 3 });
      expect(rack.bins).toHaveLength(6);
    }
    const bins = racks.flatMap((r) => r.bins);
    expect(new Set(bins.map((b) => b.code)).size).toBe(36);
    for (const bin of bins) {
      expect(bin.score).not.toBeNull();
      expect(bin.score).toBeGreaterThanOrEqual(0);
      expect(bin.score).toBeLessThanOrEqual(100);
    }
  });

  it('GET /bins/:code returns the score breakdown and the pallets', async () => {
    const res = await get('/bins/a-01-01').expect(200);
    const bin = res.body as BinDetailResponse;

    expect(bin).toMatchObject({ code: 'A-01-01', aisle: 'A', rack: '01' });
    const current = bin.currentScore;
    expect(current).not.toBeNull();
    expect(current?.factors).toHaveLength(6);
    const points = current?.factors.reduce((sum, f) => sum + f.points, 0) ?? 0;
    expect(Math.abs(points - (current?.score ?? 0))).toBeLessThan(1);
    for (const pallet of bin.pallets) {
      for (const item of pallet.items) expect(item.quantity).toBeGreaterThan(0);
    }
  });

  it('GET /bins/:code returns 404 for an unknown code', async () => {
    await get('/bins/Z-99-99').expect(404);
    await get('/bins/Z-99-99/scores').expect(404);
  });

  it('GET /bins/:code/scores returns the history newest first, up to limit', async () => {
    const detail = (await get('/bins/A-01-01').expect(200)).body as BinDetailResponse;
    const all = (await get('/bins/A-01-01/scores?limit=100').expect(200))
      .body as ScoreHistoryEntry[];

    expect(all.length).toBeGreaterThan(0); // at least the SEED row
    const times = all.map((e) => Date.parse(e.computedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(all[0]?.score).toBe(detail.currentScore?.score);

    const one = (await get('/bins/A-01-01/scores?limit=1').expect(200))
      .body as ScoreHistoryEntry[];
    expect(one).toEqual([all[0]]);

    const byDefault = (await get('/bins/A-01-01/scores').expect(200))
      .body as ScoreHistoryEntry[];
    expect(byDefault).toHaveLength(Math.min(all.length, 20));
  });

  it('GET /bins/:code/scores rejects an invalid limit', async () => {
    await get('/bins/A-01-01/scores?limit=0').expect(400);
    await get('/bins/A-01-01/scores?limit=abc').expect(400);
  });
});
