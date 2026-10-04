import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ScoringModule } from './scoring/scoring.module.js';
import { WarehouseModule } from './warehouse/warehouse.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    ScoringModule,
    WarehouseModule,
  ],
})
export class AppModule {}
