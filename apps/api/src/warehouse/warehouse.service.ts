import { Injectable, NotFoundException } from '@nestjs/common';
import type { WarehouseLayoutResponse } from '@rivbins/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { toWarehouseLayout } from './warehouse.mapper.js';

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  /** The heatmap layout of the (single) warehouse with each bin's current score. */
  async getLayout(): Promise<WarehouseLayoutResponse> {
    const warehouse = await this.prisma.warehouse.findFirst({
      orderBy: { id: 'asc' },
      select: {
        code: true,
        name: true,
        aisles: {
          select: {
            code: true,
            position: true,
            racks: {
              select: {
                code: true,
                position: true,
                bins: {
                  select: {
                    id: true,
                    code: true,
                    level: true,
                    position: true,
                    lastAuditedAt: true,
                    currentScore: { select: { score: true, computedAt: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!warehouse) throw new NotFoundException('No warehouse found');
    return toWarehouseLayout(warehouse);
  }
}
