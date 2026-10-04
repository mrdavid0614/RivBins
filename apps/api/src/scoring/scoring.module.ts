import { Module } from '@nestjs/common';
import { ScoringController } from './scoring.controller.js';
import { ScoringService } from './scoring.service.js';

@Module({
  controllers: [ScoringController],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
