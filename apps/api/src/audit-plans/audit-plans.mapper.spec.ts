import {
  toAuditPlan,
  toAuditPlanSummary,
  toAuditTaskRow,
  type TaskRow,
} from './audit-plans.mapper.js';

const task = (
  id: number,
  rank: number,
  overrides: Partial<TaskRow> = {},
): TaskRow => ({
  id,
  planId: 7,
  rank,
  scoreAtCreation: 80 - rank,
  status: 'PENDING',
  createdAt: new Date('2026-10-05T10:00:00Z'),
  completedAt: null,
  bin: { code: `A-01-0${rank}`, currentScore: { score: 50 } },
  ...overrides,
});

describe('toAuditTaskRow', () => {
  it('flattens the bin and serializes dates', () => {
    expect(
      toAuditTaskRow(
        task(3, 1, {
          status: 'DONE',
          completedAt: new Date('2026-10-06T08:30:00Z'),
        }),
      ),
    ).toEqual({
      id: 3,
      planId: 7,
      rank: 1,
      binCode: 'A-01-01',
      scoreAtCreation: 79,
      currentScore: 50,
      status: 'DONE',
      createdAt: '2026-10-05T10:00:00.000Z',
      completedAt: '2026-10-06T08:30:00.000Z',
    });
  });

  it('keeps a missing current score as null', () => {
    expect(
      toAuditTaskRow(
        task(1, 1, { bin: { code: 'A-01-01', currentScore: null } }),
      ).currentScore,
    ).toBeNull();
  });
});

describe('toAuditPlan', () => {
  it('orders tasks by rank', () => {
    const plan = toAuditPlan({
      id: 7,
      requestedN: 3,
      createdAt: new Date('2026-10-05T10:00:00Z'),
      tasks: [task(12, 3), task(10, 1), task(11, 2)],
    });
    expect(plan).toMatchObject({
      id: 7,
      requestedN: 3,
      createdAt: '2026-10-05T10:00:00.000Z',
    });
    expect(plan.tasks.map((t) => t.rank)).toEqual([1, 2, 3]);
  });
});

describe('toAuditPlanSummary', () => {
  it('counts tasks by status', () => {
    expect(
      toAuditPlanSummary({
        id: 2,
        requestedN: 3,
        createdAt: new Date('2026-10-05T10:00:00Z'),
        tasks: [
          { status: 'PENDING' },
          { status: 'DONE' },
          { status: 'PENDING' },
        ],
      }),
    ).toEqual({
      id: 2,
      requestedN: 3,
      createdAt: '2026-10-05T10:00:00.000Z',
      taskCount: 3,
      pendingCount: 2,
      doneCount: 1,
    });
  });
});
