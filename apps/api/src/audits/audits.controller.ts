import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import type { CountResultResponse, CountSheetResponse } from '@rivbins/shared';
import { normalizeBinCode } from '../bins/bin-code.js';
import { AuditsService } from './audits.service.js';
import { parseCountRequest } from './count.validation.js';

/** The count flow, addressed by bin code like the bin detail (D-062, D-072). */
@Controller('bins')
export class AuditsController {
  constructor(private readonly audits: AuditsService) {}

  @Get(':code/count-sheet')
  countSheet(@Param('code') code: string): Promise<CountSheetResponse> {
    return this.audits.getCountSheet(normalizeBinCode(code));
  }

  /** Saves a count and returns the result with the bin's new score. */
  @Post(':code/counts')
  submit(
    @Param('code') code: string,
    @Body() body: unknown,
  ): Promise<CountResultResponse> {
    const parsed = parseCountRequest(body);
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    return this.audits.submitCount(normalizeBinCode(code), parsed.value);
  }
}
