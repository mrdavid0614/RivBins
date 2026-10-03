// Pure seed data generator: no database access (D-042).
//
// Simulates the last 30 days of warehouse activity forward in time, so movements,
// pallet locations, quantities, and audits are consistent by construction. Every row
// gets its ID here; the runner (prisma/seed.ts) only inserts them.
import type {
  AuditOutcome,
  MovementType,
} from '../../src/generated/prisma/enums.js';
import { createRng, type Rng } from './random.js';

export const DEFAULT_SEED = 20261003;
export const SIMULATED_DAYS = 30;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Initial putaways happen in the first hours of day 0; everything else after them. */
const INITIAL_PUTAWAY_HOURS = 2;
const MAX_PALLETS_PER_BIN = 4;

// ─────────────────────────── Layout (D-043) ───────────────────────────

const AISLE_CODES = ['A', 'B', 'C'] as const;
const RACKS_PER_AISLE = 2;
const LEVELS_PER_RACK = 2;
const POSITIONS_PER_LEVEL = 3;

const PRODUCT_NAMES = [
  'Bottled Water 24pk',
  'Sparkling Water 12pk',
  'Orange Juice 1L',
  'Apple Juice 1L',
  'Ground Coffee 500g',
  'Green Tea 100ct',
  'Pasta Penne 1kg',
  'Basmati Rice 5kg',
  'Olive Oil 1L',
  'Tomato Sauce 680g',
  'Canned Tuna 4pk',
  'Black Beans 425g',
  'Paper Towels 6pk',
  'Toilet Paper 12pk',
  'Dish Soap 750ml',
  'Laundry Detergent 3L',
  'Trash Bags 50ct',
  'AA Batteries 8pk',
  'Hand Soap 500ml',
  'Cereal Oats 1kg',
] as const;

// ─────────────────────────── Risk profiles ───────────────────────────

type Profile = 'cold' | 'warm' | 'hot';

interface ProfileRates {
  picksPerDay: number;
  putawaysPerDay: number;
  movesOutPerDay: number;
  manualAdjustmentsPerDay: number;
  initialPallets: readonly [number, number];
  /** Distinct products this bin's pallets are drawn from. */
  productPool: readonly [number, number];
  /** Relative chance of being the destination of a MOVE. */
  moveInWeight: number;
}

const PROFILES: Record<Profile, ProfileRates> = {
  cold: {
    picksPerDay: 0.3,
    putawaysPerDay: 0.03,
    movesOutPerDay: 0.03,
    manualAdjustmentsPerDay: 0.01,
    initialPallets: [1, 2],
    productPool: [1, 2],
    moveInWeight: 1,
  },
  warm: {
    picksPerDay: 1,
    putawaysPerDay: 0.1,
    movesOutPerDay: 0.1,
    manualAdjustmentsPerDay: 0.06,
    initialPallets: [1, 3],
    productPool: [2, 4],
    moveInWeight: 2,
  },
  hot: {
    picksPerDay: 2.5,
    putawaysPerDay: 0.2,
    movesOutPerDay: 0.25,
    manualAdjustmentsPerDay: 0.15,
    initialPallets: [2, 3],
    productPool: [4, 7],
    moveInWeight: 3,
  },
};

interface AuditSpec {
  daysAgo: readonly [number, number];
  outcome: AuditOutcome;
  /** Target Σ|counted − expected| / Σ expected, FAIL only. */
  discrepancy?: readonly [number, number];
}

/** How many bins get each profile and which past audits (D-044). Sums to 36. */
const BIN_PLANS: readonly {
  profile: Profile;
  bins: number;
  audits: readonly AuditSpec[];
}[] = [
  // Green: recently passed, quiet.
  { profile: 'cold', bins: 10, audits: [{ daysAgo: [1, 7], outcome: 'PASS' }] },
  { profile: 'cold', bins: 4, audits: [] },
  // Yellow: audited a while ago, or never.
  {
    profile: 'warm',
    bins: 6,
    audits: [{ daysAgo: [12, 25], outcome: 'PASS' }],
  },
  {
    profile: 'warm',
    bins: 2,
    audits: [{ daysAgo: [15, 25], outcome: 'FAIL', discrepancy: [0.04, 0.1] }],
  },
  { profile: 'warm', bins: 6, audits: [] },
  // Red: busy, with repeated failed counts.
  {
    profile: 'hot',
    bins: 5,
    audits: [
      { daysAgo: [22, 28], outcome: 'FAIL', discrepancy: [0.05, 0.15] },
      { daysAgo: [10, 18], outcome: 'FAIL', discrepancy: [0.15, 0.35] },
    ],
  },
  { profile: 'hot', bins: 3, audits: [] },
];

// ─────────────────────────── Output rows ───────────────────────────

export interface WarehouseRow {
  id: number;
  code: string;
  name: string;
}
export interface AisleRow {
  id: number;
  warehouseId: number;
  code: string;
  position: number;
}
export interface RackRow {
  id: number;
  aisleId: number;
  code: string;
  position: number;
}
export interface BinRow {
  id: number;
  rackId: number;
  code: string;
  level: number;
  position: number;
  lastAuditedAt: Date | null;
}
export interface ProductRow {
  id: number;
  sku: string;
  name: string;
}
export interface PalletRow {
  id: number;
  code: string;
  binId: number;
}
export interface PalletItemRow {
  id: number;
  palletId: number;
  productId: number;
  quantity: number;
}
export interface MovementRow {
  id: number;
  type: MovementType;
  binId: number;
  fromBinId: number | null;
  palletId: number;
  productId: number | null;
  quantityDelta: number | null;
  auditResultId: number | null;
  occurredAt: Date;
}
export interface AuditResultRow {
  id: number;
  binId: number;
  taskId: null;
  autoOutcome: AuditOutcome;
  finalOutcome: AuditOutcome;
  totalExpected: number;
  totalCounted: number;
  discrepancyRatio: number;
  countedAt: Date;
}
export interface AuditResultLineRow {
  id: number;
  auditResultId: number;
  palletId: number;
  productId: number;
  expectedQty: number;
  countedQty: number;
  difference: number;
}

export interface SeedData {
  warehouse: WarehouseRow;
  aisles: AisleRow[];
  racks: RackRow[];
  bins: BinRow[];
  products: ProductRow[];
  pallets: PalletRow[];
  palletItems: PalletItemRow[];
  movements: MovementRow[];
  auditResults: AuditResultRow[];
  auditResultLines: AuditResultLineRow[];
}

// ─────────────────────────── Simulation ───────────────────────────

type SimEvent =
  | {
      kind: 'PICK' | 'PUTAWAY' | 'MOVE' | 'ADJUSTMENT';
      at: Date;
      binId: number;
    }
  | { kind: 'AUDIT'; at: Date; binId: number; audit: AuditSpec };

export interface GenerateOptions {
  /** End of the simulated window; movements fall within the 30 days before it. */
  now: Date;
  seed?: number;
}

export function generateSeedData({
  now,
  seed = DEFAULT_SEED,
}: GenerateOptions): SeedData {
  const rng = createRng(seed);
  const windowStart = now.getTime() - SIMULATED_DAYS * DAY_MS;

  const warehouse: WarehouseRow = {
    id: 1,
    code: 'WH1',
    name: 'Main Warehouse',
  };
  const { aisles, racks, bins } = buildLayout(warehouse.id);
  const products: ProductRow[] = PRODUCT_NAMES.map((name, i) => ({
    id: i + 1,
    sku: `SKU-${1001 + i}`,
    name,
  }));

  // Spread the plans randomly across the layout, so risk isn't grouped by aisle.
  const plans = rng.shuffle(
    BIN_PLANS.flatMap((plan) =>
      Array.from({ length: plan.bins }, () => ({
        profile: plan.profile,
        audits: plan.audits,
      })),
    ),
  );
  if (plans.length !== bins.length) {
    throw new Error(
      `BIN_PLANS covers ${plans.length} bins, the layout has ${bins.length}`,
    );
  }
  const profileOf = new Map<number, Profile>();
  const productPoolOf = new Map<number, number[]>();
  bins.forEach((bin, i) => {
    const plan = plans[i]!;
    profileOf.set(bin.id, plan.profile);
    const [minPool, maxPool] = PROFILES[plan.profile].productPool;
    productPoolOf.set(
      bin.id,
      rng
        .shuffle(products)
        .slice(0, rng.int(minPool, maxPool))
        .map((p) => p.id),
    );
  });

  const pallets: PalletRow[] = [];
  const palletItems: PalletItemRow[] = [];
  const movements: MovementRow[] = [];
  const auditResults: AuditResultRow[] = [];
  const auditResultLines: AuditResultLineRow[] = [];

  const addMovement = (row: Omit<MovementRow, 'id'>): void => {
    movements.push({ id: movements.length + 1, ...row });
  };
  const palletsIn = (binId: number): PalletRow[] =>
    pallets.filter((p) => p.binId === binId);
  const linesIn = (binId: number): PalletItemRow[] => {
    const ids = new Set(palletsIn(binId).map((p) => p.id));
    return palletItems.filter((item) => ids.has(item.palletId));
  };

  const putaway = (binId: number, at: Date): void => {
    if (palletsIn(binId).length >= MAX_PALLETS_PER_BIN) return;
    const pallet: PalletRow = {
      id: pallets.length + 1,
      code: `PLT-${String(pallets.length + 1).padStart(4, '0')}`,
      binId,
    };
    pallets.push(pallet);
    const pool = productPoolOf.get(binId)!;
    for (const productId of rng
      .shuffle(pool)
      .slice(0, rng.int(1, Math.min(3, pool.length)))) {
      palletItems.push({
        id: palletItems.length + 1,
        palletId: pallet.id,
        productId,
        quantity: rng.int(20, 120),
      });
    }
    addMovement({
      type: 'PUTAWAY',
      binId,
      fromBinId: null,
      palletId: pallet.id,
      productId: null,
      quantityDelta: null,
      auditResultId: null,
      occurredAt: at,
    });
  };

  // Picks never empty a line, so every pallet keeps at least one unit per product.
  const pick = (binId: number, at: Date): void => {
    const pickable = linesIn(binId).filter((line) => line.quantity >= 2);
    if (pickable.length === 0) return;
    const line = rng.pick(pickable);
    const units = rng.int(
      1,
      Math.max(1, Math.min(line.quantity - 1, Math.ceil(line.quantity * 0.2))),
    );
    line.quantity -= units;
    addMovement({
      type: 'PICK',
      binId,
      fromBinId: null,
      palletId: line.palletId,
      productId: line.productId,
      quantityDelta: -units,
      auditResultId: null,
      occurredAt: at,
    });
  };

  // A bin never gives away its last pallet, so no bin is ever empty.
  const move = (fromBinId: number, at: Date): void => {
    const source = palletsIn(fromBinId);
    if (source.length < 2) return;
    const destinations = bins.filter(
      (b) => b.id !== fromBinId && palletsIn(b.id).length < MAX_PALLETS_PER_BIN,
    );
    if (destinations.length === 0) return;
    const pallet = rng.pick(source);
    const destination = weightedPick(
      rng,
      destinations,
      (b) => PROFILES[profileOf.get(b.id)!].moveInWeight,
    );
    pallet.binId = destination.id;
    addMovement({
      type: 'MOVE',
      binId: destination.id,
      fromBinId,
      palletId: pallet.id,
      productId: null,
      quantityDelta: null,
      auditResultId: null,
      occurredAt: at,
    });
  };

  const manualAdjustment = (binId: number, at: Date): void => {
    const lines = linesIn(binId);
    if (lines.length === 0) return;
    const line = rng.pick(lines);
    const magnitude = rng.int(1, 3);
    const delta =
      line.quantity - magnitude >= 1 && rng.chance(0.5)
        ? -magnitude
        : magnitude;
    line.quantity += delta;
    addMovement({
      type: 'ADJUSTMENT',
      binId,
      fromBinId: null,
      palletId: line.palletId,
      productId: line.productId,
      quantityDelta: delta,
      auditResultId: null,
      occurredAt: at,
    });
  };

  const audit = (binId: number, at: Date, spec: AuditSpec): void => {
    const lines = linesIn(binId);
    const counted = new Map(lines.map((line) => [line.id, line.quantity]));
    if (spec.outcome === 'FAIL') {
      const [minRatio, maxRatio] = spec.discrepancy ?? [0.05, 0.1];
      const totalExpected = sum(lines.map((line) => line.quantity));
      const totalOff = Math.max(
        1,
        Math.round(rng.float(minRatio, maxRatio) * totalExpected),
      );
      const off = rng
        .shuffle(lines)
        .slice(0, rng.int(1, Math.min(2, lines.length)));
      const splitAt =
        off.length === 2 && totalOff >= 2 ? rng.int(1, totalOff - 1) : totalOff;
      off.forEach((line, i) => {
        const units = i === 0 ? splitAt : totalOff - splitAt;
        if (units === 0) return;
        // Short counts are the common case, but never below 1 unit.
        const short = line.quantity - units >= 1 && rng.chance(0.6);
        counted.set(line.id, line.quantity + (short ? -units : units));
      });
    }

    const result: AuditResultRow = {
      id: auditResults.length + 1,
      binId,
      taskId: null,
      autoOutcome: 'PASS',
      finalOutcome: 'PASS',
      totalExpected: 0,
      totalCounted: 0,
      discrepancyRatio: 0,
      countedAt: at,
    };
    let totalAbsDiff = 0;
    for (const line of lines) {
      const countedQty = counted.get(line.id)!;
      const difference = countedQty - line.quantity;
      auditResultLines.push({
        id: auditResultLines.length + 1,
        auditResultId: result.id,
        palletId: line.palletId,
        productId: line.productId,
        expectedQty: line.quantity,
        countedQty,
        difference,
      });
      result.totalExpected += line.quantity;
      result.totalCounted += countedQty;
      totalAbsDiff += Math.abs(difference);
    }
    // Exact-match tolerance (D-002); the seed never overrides, so final = auto.
    result.autoOutcome = totalAbsDiff === 0 ? 'PASS' : 'FAIL';
    result.finalOutcome = result.autoOutcome;
    result.discrepancyRatio =
      result.totalExpected === 0 ? 0 : totalAbsDiff / result.totalExpected;
    auditResults.push(result);

    // A failed count corrects inventory with audit-generated adjustments (D-004).
    if (result.finalOutcome === 'FAIL') {
      for (const line of lines) {
        const difference = counted.get(line.id)! - line.quantity;
        if (difference === 0) continue;
        line.quantity += difference;
        addMovement({
          type: 'ADJUSTMENT',
          binId,
          fromBinId: null,
          palletId: line.palletId,
          productId: line.productId,
          quantityDelta: difference,
          auditResultId: result.id,
          occurredAt: at,
        });
      }
    }
    bins.find((b) => b.id === binId)!.lastAuditedAt = at;
  };

  // Day 0: initial stock, in time order across all bins.
  bins
    .flatMap((bin) => {
      const [min, max] = PROFILES[profileOf.get(bin.id)!].initialPallets;
      return Array.from({ length: rng.int(min, max) }, () => ({
        binId: bin.id,
        time: Math.floor(
          windowStart + rng.next() * INITIAL_PUTAWAY_HOURS * HOUR_MS,
        ),
      }));
    })
    .sort((a, b) => a.time - b.time)
    .forEach(({ binId, time }) => putaway(binId, new Date(time)));

  // Days 0–29: daily activity and the planned audits, applied in time order.
  const randomTimeOn = (day: number): Date =>
    new Date(
      Math.floor(
        windowStart +
          day * DAY_MS +
          INITIAL_PUTAWAY_HOURS * HOUR_MS +
          rng.next() * (DAY_MS - INITIAL_PUTAWAY_HOURS * HOUR_MS),
      ),
    );
  const auditsByDay = new Map<number, { binId: number; spec: AuditSpec }[]>();
  bins.forEach((bin, i) => {
    for (const spec of plans[i]!.audits) {
      const day = SIMULATED_DAYS - rng.int(spec.daysAgo[0], spec.daysAgo[1]);
      auditsByDay.set(day, [
        ...(auditsByDay.get(day) ?? []),
        { binId: bin.id, spec },
      ]);
    }
  });

  for (let day = 0; day < SIMULATED_DAYS; day++) {
    const events: SimEvent[] = [];
    for (const bin of bins) {
      const rates = PROFILES[profileOf.get(bin.id)!];
      const schedule = (
        kind: Exclude<SimEvent['kind'], 'AUDIT'>,
        rate: number,
      ): void => {
        for (let n = rng.count(rate); n > 0; n--) {
          events.push({ kind, at: randomTimeOn(day), binId: bin.id });
        }
      };
      schedule('PICK', rates.picksPerDay);
      schedule('PUTAWAY', rates.putawaysPerDay);
      schedule('MOVE', rates.movesOutPerDay);
      schedule('ADJUSTMENT', rates.manualAdjustmentsPerDay);
    }
    for (const { binId, spec } of auditsByDay.get(day) ?? []) {
      events.push({ kind: 'AUDIT', at: randomTimeOn(day), binId, audit: spec });
    }

    events.sort((a, b) => a.at.getTime() - b.at.getTime());
    for (const event of events) {
      switch (event.kind) {
        case 'PICK':
          pick(event.binId, event.at);
          break;
        case 'PUTAWAY':
          putaway(event.binId, event.at);
          break;
        case 'MOVE':
          move(event.binId, event.at);
          break;
        case 'ADJUSTMENT':
          manualAdjustment(event.binId, event.at);
          break;
        case 'AUDIT':
          audit(event.binId, event.at, event.audit);
          break;
      }
    }
  }

  return {
    warehouse,
    aisles,
    racks,
    bins,
    products,
    pallets,
    palletItems,
    movements,
    auditResults,
    auditResultLines,
  };
}

function buildLayout(
  warehouseId: number,
): Pick<SeedData, 'aisles' | 'racks' | 'bins'> {
  const aisles: AisleRow[] = [];
  const racks: RackRow[] = [];
  const bins: BinRow[] = [];
  AISLE_CODES.forEach((aisleCode, a) => {
    const aisle: AisleRow = {
      id: aisles.length + 1,
      warehouseId,
      code: aisleCode,
      position: a + 1,
    };
    aisles.push(aisle);
    for (let r = 1; r <= RACKS_PER_AISLE; r++) {
      const rack: RackRow = {
        id: racks.length + 1,
        aisleId: aisle.id,
        code: pad2(r),
        position: r,
      };
      racks.push(rack);
      for (let level = 1; level <= LEVELS_PER_RACK; level++) {
        for (let position = 1; position <= POSITIONS_PER_LEVEL; position++) {
          const slot = (level - 1) * POSITIONS_PER_LEVEL + position;
          bins.push({
            id: bins.length + 1,
            rackId: rack.id,
            code: `${aisleCode}-${rack.code}-${pad2(slot)}`,
            level,
            position,
            lastAuditedAt: null,
          });
        }
      }
    }
  });
  return { aisles, racks, bins };
}

function weightedPick<T>(
  rng: Rng,
  items: readonly T[],
  weight: (item: T) => number,
): T {
  let remaining = rng.next() * sum(items.map(weight));
  for (const item of items) {
    remaining -= weight(item);
    if (remaining < 0) return item;
  }
  return items[items.length - 1]!;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
