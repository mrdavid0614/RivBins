import type { WarehouseLayoutResponse } from '@rivbins/shared';
import { RackGrid } from './RackGrid';

interface HeatmapProps {
  layout: WarehouseLayoutResponse;
  selectedCode: string | null;
}

/** Bins grouped by aisle and rack, colored by current score. */
export function Heatmap({ layout, selectedCode }: HeatmapProps) {
  return (
    <div className="flex flex-col gap-6">
      {layout.aisles.map((aisle) => (
        <section key={aisle.code} aria-labelledby={`aisle-${aisle.code}`}>
          <h2 id={`aisle-${aisle.code}`} className="mb-2 text-base font-semibold">
            Aisle {aisle.code}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {aisle.racks.map((rack) => (
              <RackGrid key={rack.code} aisle={aisle.code} rack={rack} selectedCode={selectedCode} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
