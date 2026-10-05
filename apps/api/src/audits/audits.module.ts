import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module.js';
import { AuditsController } from './audits.controller.js';
import { AuditsService } from './audits.service.js';

@Module({
  imports: [ScoringModule],
  controllers: [AuditsController],
  providers: [AuditsService],
})
export class AuditsModule {}
