// Requires a seeded database: run `pnpm db:up`, `pnpm db:migrate`, and `pnpm db:seed`.
// Creates audit plans and tasks, and deletes every plan it created afterwards.
import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  AuditPlanEligibility,
  AuditPlanResponse,
  AuditPlanSummary,
  AuditTaskRow,
} from '@rivbins/shared';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Audit plans (e2e)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  /** Plans with a higher id were created by this file. */
  let lastPlanIdBefore: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    const last = await prisma.auditPlan.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    lastPlanIdBefore = last?.id ?? 0;
  });

  afterAll(async () => {
    const created = { planId: { gt: lastPlanIdBefore } };
    await prisma.auditTask.deleteMany({ where: created });
    await prisma.auditPlan.deleteMany({
      where: { id: { gt: lastPlanIdBefore } },
    });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const createPlan = async (n: unknown, status = 201) =>
    (await http().post('/audit-plans').send({ n }).expect(status))
      .body as AuditPlanResponse;
  const eligibleBins = async () =>
    (
      (await http().get('/audit-plans/eligibility').expect(200))
        .body as AuditPlanEligibility
    ).eligibleBins;

  /** Eligible bins straight from the database, riskiest first (ties by code). */
  async function expectedRanking(): Promise<{ code: string; score: number }[]> {
    const bins = await prisma.bin.findMany({
      where: {
        currentScoreId: { not: null },
        tasks: { none: { status: 'PENDING' } },
      },
      select: { code: true, currentScore: { select: { score: true } } },
    });
    return bins
      .map((b) => ({ code: b.code, score: b.currentScore?.score ?? 0 }))
      .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
  }

  it('GET /audit-plans/eligibility counts scored bins without a pending task', async () => {
    expect(await eligibleBins()).toBe((await expectedRanking()).length);
  });

  it('POST /audit-plans picks the Top N eligible bins with a score snapshot', async () => {
    const expected = (await expectedRanking()).slice(0, 3);
    expect(expected).toHaveLength(3); // the database must be seeded

    const plan = await createPlan(3);

    expect(plan.requestedN).toBe(3);
    expect(plan.tasks.map((t) => t.rank)).toEqual([1, 2, 3]);
    expect(plan.tasks.map((t) => t.binCode)).toEqual(
      expected.map((b) => b.code),
    );
    for (const [i, task] of plan.tasks.entries()) {
      expect(task).toMatchObject({
        planId: plan.id,
        status: 'PENDING',
        scoreAtCreation: expected[i]?.score,
        currentScore: expected[i]?.score,
        completedAt: null,
      });
    }
  });

  it('a new plan skips bins with a pending task and takes the next riskiest (D-006)', async () => {
    const before = await eligibleBins();
    const pending = new Set(
      (
        await prisma.auditTask.findMany({
          where: { status: 'PENDING' },
          select: { bin: { select: { code: true } } },
        })
      ).map((t) => t.bin.code),
    );
    const expected = (await expectedRanking()).slice(0, 3).map((b) => b.code);

    const plan = await createPlan(3);

    const codes = plan.tasks.map((t) => t.binCode);
    expect(codes).toEqual(expected);
    expect(codes.some((code) => pending.has(code))).toBe(false);
    expect(await eligibleBins()).toBe(before - 3);
  });

  it('concurrent plans never pick the same bin', async () => {
    const [a, b] = await Promise.all([createPlan(2), createPlan(2)]);
    const codes = [...a.tasks, ...b.tasks].map((t) => t.binCode);
    expect(codes).toHaveLength(4);
    expect(new Set(codes).size).toBe(4);
  });

  it('the pending-task index rejects a second pending task, and skipDuplicates skips it', async () => {
    const task = await prisma.auditTask.findFirstOrThrow({
      where: { status: 'PENDING', planId: { gt: lastPlanIdBefore } },
      select: { binId: true, planId: true },
    });
    const result = await prisma.auditTask.createMany({
      data: [
        {
          planId: task.planId,
          binId: task.binId,
          rank: 99,
          scoreAtCreation: 0,
        },
      ],
      skipDuplicates: true,
    });
    expect(result.count).toBe(0);
  });

  it.each([0, -1, 2.5, '3', null])('rejects n = %s with 400', async (n) => {
    await createPlan(n, 400);
  });

  it('rejects n above the eligible bins with 400 and creates no plan (D-069)', async () => {
    const plansBefore = await prisma.auditPlan.count();
    await createPlan((await eligibleBins()) + 1, 400);
    expect(await prisma.auditPlan.count()).toBe(plansBefore);
  });

  it('GET /audit-tasks filters by status and plan', async () => {
    const plan = await createPlan(1);

    const res = await http()
      .get(`/audit-tasks?status=pending&planId=${plan.id}`)
      .expect(200);
    expect(res.body as AuditTaskRow[]).toEqual(plan.tasks);

    const done = (await http().get('/audit-tasks?status=DONE').expect(200))
      .body as AuditTaskRow[];
    expect(done.every((t) => t.status === 'DONE')).toBe(true);

    await http().get('/audit-tasks?status=OPEN').expect(400);
    await http().get('/audit-tasks?limit=0').expect(400);
  });

  it('GET /audit-plans lists summaries newest first', async () => {
    const res = await http().get('/audit-plans').expect(200);
    const plans = res.body as AuditPlanSummary[];
    const ids = plans.map((p) => p.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
    const latest = plans[0];
    expect(latest).toMatchObject({
      taskCount: 1,
      pendingCount: 1,
      doneCount: 0,
      requestedN: 1,
    });
  });

  it('returns 409 once every scored bin has a pending task (D-068)', async () => {
    await createPlan(await eligibleBins());
    expect(await eligibleBins()).toBe(0);
    await http().post('/audit-plans').send({ n: 1 }).expect(409);
  });
});
