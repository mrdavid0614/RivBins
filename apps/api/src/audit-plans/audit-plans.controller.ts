import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import type {
  AuditPlanEligibility,
  AuditPlanResponse,
  AuditPlanSummary,
  AuditTaskRow,
  TaskStatus,
} from '@rivbins/shared';
import { AuditPlansService } from './audit-plans.service.js';
import { isValidPlanSize } from './audit-plans.selection.js';

export const DEFAULT_TASK_LIMIT = 100;
export const MAX_TASK_LIMIT = 500;
/** Largest value of a Postgres INT4 id column. */
export const MAX_PLAN_ID = 2_147_483_647;

const TASK_STATUSES: readonly TaskStatus[] = ['PENDING', 'DONE'];

@Controller('audit-plans')
export class AuditPlansController {
  constructor(private readonly plans: AuditPlansService) {}

  /** The largest N a new plan can request (D-069). */
  @Get('eligibility')
  eligibility(): Promise<AuditPlanEligibility> {
    return this.plans.getEligibility();
  }

  /** Creates a plan with the Top N eligible bins (D-006, D-067). */
  @Post()
  create(@Body('n') n: unknown): Promise<AuditPlanResponse> {
    if (!isValidPlanSize(n)) {
      throw new BadRequestException('n must be a whole number of at least 1');
    }
    return this.plans.createPlan(n);
  }

  @Get()
  list(): Promise<AuditPlanSummary[]> {
    return this.plans.listPlans();
  }
}

@Controller('audit-tasks')
export class AuditTasksController {
  constructor(private readonly plans: AuditPlansService) {}

  /** Tasks table, optionally filtered by status and plan. */
  @Get()
  list(
    @Query('status') status: unknown,
    @Query('planId', new ParseIntPipe({ optional: true }))
    planId: number | undefined,
    @Query('limit', new DefaultValuePipe(DEFAULT_TASK_LIMIT), ParseIntPipe)
    limit: number,
  ): Promise<AuditTaskRow[]> {
    // A repeated ?status= arrives as an array.
    if (status !== undefined && typeof status !== 'string') {
      throw new BadRequestException('status must be a single value');
    }
    const normalized = status?.toUpperCase();
    if (
      normalized !== undefined &&
      !TASK_STATUSES.some((s) => s === normalized)
    ) {
      throw new BadRequestException(
        `status must be one of ${TASK_STATUSES.join(', ')}`,
      );
    }
    if (limit < 1 || limit > MAX_TASK_LIMIT) {
      throw new BadRequestException(
        `limit must be between 1 and ${MAX_TASK_LIMIT}`,
      );
    }
    if (planId !== undefined && (planId < 1 || planId > MAX_PLAN_ID)) {
      throw new BadRequestException(
        `planId must be between 1 and ${MAX_PLAN_ID}`,
      );
    }
    return this.plans.listTasks({
      status: normalized as TaskStatus | undefined,
      planId,
      limit,
    });
  }
}
