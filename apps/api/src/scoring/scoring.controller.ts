import { Controller, Post } from '@nestjs/common';
import type { RecomputeScoresResponse } from '@rivbins/shared';
import { ScoringService } from './scoring.service.js';

@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoring: ScoringService) {}

  /** Recomputes every bin's score (D-005, D-053). */
  @Post('recompute')
  recompute(): Promise<RecomputeScoresResponse> {
    return this.scoring.recomputeAll();
  }
}
