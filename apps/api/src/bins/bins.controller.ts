import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import type { BinDetailResponse, ScoreHistoryEntry } from '@rivbins/shared';
import { BinsService } from './bins.service.js';

export const DEFAULT_HISTORY_LIMIT = 20;
export const MAX_HISTORY_LIMIT = 100;

/** Bin codes are matched case-insensitively, so typed or scanned codes both work. */
const normalizeCode = (code: string): string => code.trim().toUpperCase();

@Controller('bins')
export class BinsController {
  constructor(private readonly bins: BinsService) {}

  /** Bin detail by code (D-062). */
  @Get(':code')
  detail(@Param('code') code: string): Promise<BinDetailResponse> {
    return this.bins.getDetail(normalizeCode(code));
  }

  /** Score history, newest first; `limit` defaults to 20 (D-063). */
  @Get(':code/scores')
  scores(
    @Param('code') code: string,
    @Query('limit', new DefaultValuePipe(DEFAULT_HISTORY_LIMIT), ParseIntPipe)
    limit: number,
  ): Promise<ScoreHistoryEntry[]> {
    if (limit < 1 || limit > MAX_HISTORY_LIMIT) {
      throw new BadRequestException(`limit must be between 1 and ${MAX_HISTORY_LIMIT}`);
    }
    return this.bins.getScoreHistory(normalizeCode(code), limit);
  }
}
