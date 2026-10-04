import { Module } from '@nestjs/common';
import { BinsController } from './bins.controller.js';
import { BinsService } from './bins.service.js';

@Module({
  controllers: [BinsController],
  providers: [BinsService],
})
export class BinsModule {}
