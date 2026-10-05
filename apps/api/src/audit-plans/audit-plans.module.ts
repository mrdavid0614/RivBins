import { Module } from '@nestjs/common';
import {
  AuditPlansController,
  AuditTasksController,
} from './audit-plans.controller.js';
import { AuditPlansService } from './audit-plans.service.js';

@Module({
  controllers: [AuditPlansController, AuditTasksController],
  providers: [AuditPlansService],
})
export class AuditPlansModule {}
