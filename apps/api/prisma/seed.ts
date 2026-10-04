// Seed runner: wipes the database, inserts the generated data, and stores the
// initial SEED score of every bin (D-042, D-046, D-049).
// Run with `pnpm db:seed` (Prisma runs it through tsx, see prisma.config.ts).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { computeAndStoreScores } from '../src/scoring/scoring.persist.js';
import { generateSeedData } from './seed/generate.js';

// Every table, so the seed always starts from an empty database.
const ALL_TABLES = [
  'Warehouse',
  'Aisle',
  'Rack',
  'Bin',
  'Product',
  'Pallet',
  'PalletItem',
  'Movement',
  'BinScore',
  'AuditPlan',
  'AuditTask',
  'AuditResult',
  'AuditResultLine',
] as const;

// Tables the seed inserts into with explicit IDs; their sequences must catch up.
const SEEDED_TABLES = [
  'Warehouse',
  'Aisle',
  'Rack',
  'Bin',
  'Product',
  'Pallet',
  'PalletItem',
  'AuditResult',
  'AuditResultLine',
  'Movement',
] as const;

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error('DATABASE_URL is not set (see apps/api/.env.example)');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const data = generateSeedData({ now: new Date() });

    const { scored } = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(
          `TRUNCATE TABLE ${ALL_TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
        );

        // Insert in dependency order: audit results before the adjustments that reference them.
        await tx.warehouse.create({ data: data.warehouse });
        await tx.aisle.createMany({ data: data.aisles });
        await tx.rack.createMany({ data: data.racks });
        await tx.bin.createMany({ data: data.bins });
        await tx.product.createMany({ data: data.products });
        await tx.pallet.createMany({ data: data.pallets });
        await tx.palletItem.createMany({ data: data.palletItems });
        await tx.auditResult.createMany({ data: data.auditResults });
        await tx.auditResultLine.createMany({ data: data.auditResultLines });
        await tx.movement.createMany({ data: data.movements });

        for (const table of SEEDED_TABLES) {
          await tx.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT MAX(id) FROM "${table}"))`,
          );
        }

        return computeAndStoreScores(
          tx,
          data.bins.map((b) => b.id),
          { trigger: 'SEED' },
        );
      },
      { timeout: 60_000 },
    );

    const audited = data.bins.filter((b) => b.lastAuditedAt !== null).length;
    const failed = data.auditResults.filter(
      (r) => r.finalOutcome === 'FAIL',
    ).length;
    console.log(
      `Seeded ${data.bins.length} bins, ${data.products.length} products, ` +
        `${data.pallets.length} pallets (${data.palletItems.length} lines), ` +
        `${data.movements.length} movements, ${data.auditResults.length} audits ` +
        `(${failed} failed, ${audited} bins audited). Scored ${scored} bins.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
