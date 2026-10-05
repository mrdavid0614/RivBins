// Requires a seeded database: run `pnpm db:up`, `pnpm db:migrate`, and `pnpm db:seed`.
// Each test counts the same bin and restores it afterwards: its quantities, last audit
// date, and current score, plus the audits, adjustments, scores, and task it created.
import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CountResultResponse,
  CountSheetLine,
  CountSheetResponse,
  FactorBreakdown,
  SubmitCountRequest,
} from '@rivbins/shared';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

interface BinSnapshot {
  id: number;
  code: string;
  lastAuditedAt: Date | null;
  currentScoreId: number | null;
  quantities: { id: number; quantity: number }[];
}

describe('Count flow (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let snapshot: BinSnapshot;
  /** Plans created by the current test. */
  let planIds: number[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // A scored bin with at least two lines in stock and no pending task.
    const bins = await prisma.bin.findMany({
      where: {
        currentScoreId: { not: null },
        tasks: { none: { status: 'PENDING' } },
      },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        lastAuditedAt: true,
        currentScoreId: true,
        pallets: {
          select: { items: { select: { id: true, quantity: true } } },
        },
      },
    });
    const bin = bins.find(
      (b) =>
        b.pallets.flatMap((p) => p.items).filter((i) => i.quantity > 0)
          .length >= 2,
    );
    if (!bin) throw new Error('No bin to count: is the database seeded?');
    snapshot = {
      id: bin.id,
      code: bin.code,
      lastAuditedAt: bin.lastAuditedAt,
      currentScoreId: bin.currentScoreId,
      quantities: bin.pallets.flatMap((p) => p.items),
    };
    planIds = [];
  });

  afterEach(async () => {
    const { id, lastAuditedAt, currentScoreId, quantities } = snapshot;
    const audits = await prisma.auditResult.findMany({
      where: { binId: id, countedAt: { gt: lastAuditedAt ?? new Date(0) } },
      select: { id: true },
    });
    // Leave out audits that were already there (an older bin audit can't be newer
    // than lastAuditedAt, so this only matches the ones created here).
    const auditIds = audits.map((a) => a.id);
    await prisma.$transaction([
      prisma.bin.update({
        where: { id },
        data: { lastAuditedAt, currentScoreId },
      }),
      prisma.binScore.deleteMany({
        where: { auditResultId: { in: auditIds } },
      }),
      prisma.movement.deleteMany({
        where: { auditResultId: { in: auditIds } },
      }),
      prisma.auditResultLine.deleteMany({
        where: { auditResultId: { in: auditIds } },
      }),
      prisma.auditResult.deleteMany({ where: { id: { in: auditIds } } }),
      ...quantities.map((q) =>
        prisma.palletItem.update({
          where: { id: q.id },
          data: { quantity: q.quantity },
        }),
      ),
      prisma.auditTask.deleteMany({ where: { planId: { in: planIds } } }),
      prisma.auditPlan.deleteMany({ where: { id: { in: planIds } } }),
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const getSheet = async (code = snapshot.code) =>
    (await http().get(`/bins/${code}/count-sheet`).expect(200))
      .body as CountSheetResponse;
  const submit = (body: unknown, code = snapshot.code) =>
    http()
      .post(`/bins/${code}/counts`)
      .send(body as object);
  const sheetLines = (sheet: CountSheetResponse): CountSheetLine[] =>
    sheet.pallets.flatMap((p) => p.lines);

  /** Counts every line as expected, except the overrides (palletItemId → counted). */
  const countBody = (
    sheet: CountSheetResponse,
    finalOutcome: SubmitCountRequest['finalOutcome'],
    overrides: Record<number, number> = {},
  ): SubmitCountRequest => ({
    finalOutcome,
    lines: sheetLines(sheet).map((line) => ({
      palletItemId: line.palletItemId,
      expectedQty: line.expectedQty,
      countedQty: overrides[line.palletItemId] ?? line.expectedQty,
    })),
  });

  async function createTask(): Promise<number> {
    const plan = await prisma.auditPlan.create({
      data: {
        requestedN: 1,
        tasks: { create: { binId: snapshot.id, rank: 1, scoreAtCreation: 50 } },
      },
      select: { id: true, tasks: { select: { id: true } } },
    });
    planIds.push(plan.id);
    const task = plan.tasks[0];
    if (!task) throw new Error('Task not created');
    return task.id;
  }

  const factor = (factors: unknown, key: string) =>
    (factors as FactorBreakdown[]).find((f) => f.key === key);

  it('GET /bins/:code/count-sheet lists the lines in stock, case-insensitively', async () => {
    const sheet = await getSheet(snapshot.code.toLowerCase());
    expect(sheet).toMatchObject({
      binId: snapshot.id,
      code: snapshot.code,
      toleranceUnits: 0,
    });
    expect(sheet.pendingTask).toBeNull();

    const inStock = snapshot.quantities.filter((q) => q.quantity > 0);
    const lines = sheetLines(sheet);
    expect(lines.map((l) => l.palletItemId).sort((a, b) => a - b)).toEqual(
      inStock.map((q) => q.id).sort((a, b) => a - b),
    );
    for (const line of lines) {
      expect(line.expectedQty).toBe(
        inStock.find((q) => q.id === line.palletItemId)?.quantity,
      );
    }
  });

  it('returns 404 for an unknown bin', async () => {
    await http().get('/bins/Z-99-99/count-sheet').expect(404);
    await submit({ finalOutcome: 'PASS', lines: [] }, 'Z-99-99').expect(404);
  });

  it('returns 400 for an invalid count', async () => {
    const sheet = await getSheet();
    const body = countBody(sheet, 'PASS');
    const [first] = body.lines;
    await submit({ ...body, finalOutcome: 'MAYBE' }).expect(400);
    await submit({ ...body, lines: [{ ...first, countedQty: -1 }] }).expect(
      400,
    );
  });

  it('a PASS count completes the task, resets factors 1–3, and adds an AUDIT score', async () => {
    const taskId = await createTask();
    const sheet = await getSheet();
    expect(sheet.pendingTask?.id).toBe(taskId);

    const result = (await submit(countBody(sheet, 'PASS')).expect(201))
      .body as CountResultResponse;

    expect(result).toMatchObject({
      binCode: snapshot.code,
      autoOutcome: 'PASS',
      finalOutcome: 'PASS',
      discrepancyRatio: 0,
      adjustmentsCreated: 0,
      completedTask: { id: taskId },
    });
    expect(result.totalCounted).toBe(result.totalExpected);

    const task = await prisma.auditTask.findUniqueOrThrow({
      where: { id: taskId },
    });
    expect(task.status).toBe('DONE');
    expect(task.completedAt?.toISOString()).toBe(result.countedAt);

    const bin = await prisma.bin.findUniqueOrThrow({
      where: { id: snapshot.id },
      select: { lastAuditedAt: true, currentScore: true },
    });
    expect(bin.lastAuditedAt?.toISOString()).toBe(result.countedAt);
    expect(bin.currentScore).toMatchObject({
      trigger: 'AUDIT',
      auditResultId: result.auditResultId,
      score: result.newScore,
    });
    for (const key of [
      'timeSinceLastAudit',
      'activitySinceLastAudit',
      'adjustmentsSinceLastAudit',
      'lastDiscrepancySize',
    ]) {
      expect(factor(bin.currentScore?.factors, key)?.rawValue).toBe(0);
    }

    const audit = await prisma.auditResult.findUniqueOrThrow({
      where: { id: result.auditResultId },
      select: {
        taskId: true,
        _count: { select: { lines: true, adjustments: true } },
      },
    });
    expect(audit.taskId).toBe(taskId);
    expect(audit._count).toEqual({
      lines: sheetLines(sheet).length,
      adjustments: 0,
    });
  });

  it('an ad-hoc FAIL count adjusts the mismatched lines and corrects inventory', async () => {
    const sheet = await getSheet();
    const [short, over] = sheetLines(sheet);
    if (!short || !over) throw new Error('The bin needs two lines');
    const body = countBody(sheet, 'FAIL', {
      [short.palletItemId]: short.expectedQty - 1,
      [over.palletItemId]: over.expectedQty + 2,
    });

    const result = (await submit(body).expect(201)).body as CountResultResponse;
    expect(result).toMatchObject({
      autoOutcome: 'FAIL',
      finalOutcome: 'FAIL',
      adjustmentsCreated: 2,
      completedTask: null,
    });
    expect(result.discrepancyRatio).toBeCloseTo(3 / result.totalExpected, 10);

    const adjustments = await prisma.movement.findMany({
      where: { auditResultId: result.auditResultId },
      orderBy: { quantityDelta: 'asc' },
      select: {
        type: true,
        binId: true,
        quantityDelta: true,
        occurredAt: true,
      },
    });
    expect(adjustments).toEqual([
      expect.objectContaining({
        type: 'ADJUSTMENT',
        binId: snapshot.id,
        quantityDelta: -1,
      }),
      expect.objectContaining({
        type: 'ADJUSTMENT',
        binId: snapshot.id,
        quantityDelta: 2,
      }),
    ]);

    const items = await prisma.palletItem.findMany({
      where: { id: { in: [short.palletItemId, over.palletItemId] } },
      select: { id: true, quantity: true },
    });
    expect(items.find((i) => i.id === short.palletItemId)?.quantity).toBe(
      short.expectedQty - 1,
    );
    expect(items.find((i) => i.id === over.palletItemId)?.quantity).toBe(
      over.expectedQty + 2,
    );

    const score = await prisma.binScore.findFirstOrThrow({
      where: { auditResultId: result.auditResultId },
    });
    // Audit-generated adjustments never count as manual ones.
    expect(factor(score.factors, 'adjustmentsSinceLastAudit')?.rawValue).toBe(
      0,
    );
    expect(
      factor(score.factors, 'lastDiscrepancySize')?.rawValue,
    ).toBeGreaterThan(0);
    expect(
      factor(score.factors, 'auditFailureHistory')?.rawValue,
    ).toBeGreaterThanOrEqual(1);

    // The next sheet shows the corrected quantities.
    const next = await getSheet();
    expect(
      sheetLines(next).find((l) => l.palletItemId === over.palletItemId)
        ?.expectedQty,
    ).toBe(over.expectedQty + 2);
  });

  it('an override from FAIL to PASS records the differences without adjusting', async () => {
    const sheet = await getSheet();
    const [line] = sheetLines(sheet);
    if (!line) throw new Error('The bin needs a line');
    const body = countBody(sheet, 'PASS', {
      [line.palletItemId]: line.expectedQty + 1,
    });

    const result = (await submit(body).expect(201)).body as CountResultResponse;
    expect(result).toMatchObject({
      autoOutcome: 'FAIL',
      finalOutcome: 'PASS',
      adjustmentsCreated: 0,
    });
    expect(result.lines.find((l) => l.sku === line.sku)?.difference).toBe(1);

    expect(
      await prisma.movement.count({
        where: { auditResultId: result.auditResultId },
      }),
    ).toBe(0);
    const item = await prisma.palletItem.findUniqueOrThrow({
      where: { id: line.palletItemId },
    });
    expect(item.quantity).toBe(line.expectedQty);
  });

  it('rejects a stale sheet with 409 and writes nothing (D-075)', async () => {
    const sheet = await getSheet();
    const body = countBody(sheet, 'PASS');
    const [first, ...rest] = body.lines;
    if (!first) throw new Error('The bin needs a line');
    const auditsBefore = await prisma.auditResult.count({
      where: { binId: snapshot.id },
    });

    await submit({
      ...body,
      lines: [{ ...first, expectedQty: first.expectedQty + 1 }, ...rest],
    }).expect(409);
    await submit({ ...body, lines: rest }).expect(409);

    expect(
      await prisma.auditResult.count({ where: { binId: snapshot.id } }),
    ).toBe(auditsBefore);
    const bin = await prisma.bin.findUniqueOrThrow({
      where: { id: snapshot.id },
    });
    expect(bin.lastAuditedAt).toEqual(snapshot.lastAuditedAt);
    expect(bin.currentScoreId).toBe(snapshot.currentScoreId);
  });
});
