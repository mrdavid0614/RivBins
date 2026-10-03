import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface HealthStatus {
  status: 'ok';
  database: 'up';
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' });
    }
    return { status: 'ok', database: 'up' };
  }
}
