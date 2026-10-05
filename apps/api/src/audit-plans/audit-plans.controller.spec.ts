import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuditPlansController,
  AuditTasksController,
} from './audit-plans.controller.js';
import { AuditPlansService } from './audit-plans.service.js';

describe('Audit plan controllers', () => {
  const createPlan = vi.fn();
  const listTasks = vi.fn();
  let plans: AuditPlansController;
  let tasks: AuditTasksController;

  beforeEach(async () => {
    createPlan.mockReset().mockResolvedValue({});
    listTasks.mockReset().mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      controllers: [AuditPlansController, AuditTasksController],
      providers: [
        { provide: AuditPlansService, useValue: { createPlan, listTasks } },
      ],
    }).compile();
    plans = moduleRef.get(AuditPlansController);
    tasks = moduleRef.get(AuditTasksController);
  });

  it('passes a valid plan size through', async () => {
    await plans.create(5);
    expect(createPlan).toHaveBeenCalledWith(5);
  });

  it.each([0, -2, 2.5, '3', undefined])('rejects plan size %s', (n) => {
    expect(() => plans.create(n)).toThrow(BadRequestException);
    expect(createPlan).not.toHaveBeenCalled();
  });

  it('normalizes the status filter', async () => {
    await tasks.list('pending', 4, 50);
    expect(listTasks).toHaveBeenCalledWith({
      status: 'PENDING',
      planId: 4,
      limit: 50,
    });
  });

  it('lists every status when no filter is given', async () => {
    await tasks.list(undefined, undefined, 100);
    expect(listTasks).toHaveBeenCalledWith({
      status: undefined,
      planId: undefined,
      limit: 100,
    });
  });

  it('rejects an unknown status', () => {
    expect(() => tasks.list('OPEN', undefined, 100)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a repeated status', () => {
    expect(() => tasks.list(['PENDING', 'DONE'], undefined, 100)).toThrow(
      BadRequestException,
    );
    expect(listTasks).not.toHaveBeenCalled();
  });

  it.each([0, 501])('rejects limit %i', (limit) => {
    expect(() => tasks.list(undefined, undefined, limit)).toThrow(
      BadRequestException,
    );
    expect(listTasks).not.toHaveBeenCalled();
  });
});
