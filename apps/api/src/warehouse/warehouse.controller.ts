import { Controller, Get } from '@nestjs/common';
import type { WarehouseLayoutResponse } from '@rivbins/shared';
import { WarehouseService } from './warehouse.service.js';

@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouse: WarehouseService) {}

  /** Aisles → racks → bins with current scores, for the heatmap (D-060). */
  @Get('layout')
  layout(): Promise<WarehouseLayoutResponse> {
    return this.warehouse.getLayout();
  }
}
