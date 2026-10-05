import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CountResultResponse,
  CountSheetResponse,
  SubmitCountRequest,
} from '@rivbins/shared';
import { PENDING_TASK_SELECT } from '../audit-plans/pending-task.select.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScoringService } from '../scoring/scoring.service.js';
import {
  toCountResult,
  toCountSheet,
  type SavedLine,
} from './audits.mapper.js';
import { COUNT_CONFIG } from './count.config.js';
import { evaluateCount } from './count.evaluation.js';
import { findSheetMismatch } from './count.validation.js';

const TX_TIMEOUT_MS = 30_000;

@Injectable()
export class AuditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
  ) {}

  /** The expected pallets and lines of a bin, as the counter sees them (D-072). */
  async getCountSheet(code: string): Promise<CountSheetResponse> {
    const bin = await this.prisma.bin.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        lastAuditedAt: true,
        currentScore: { select: { score: true } },
        tasks: PENDING_TASK_SELECT,
        pallets: {
          select: {
            code: true,
            items: {
              select: {
                id: true,
                quantity: true,
                product: { select: { id: true, sku: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!bin) throw new NotFoundException(`Bin ${code} not found`);
    return toCountSheet(bin, COUNT_CONFIG.toleranceUnits);
  }

  /**
   * Saves a count in one transaction (CLAUDE.md "On save"): updates the bin first,
   * which locks it (D-056, D-057), stores the result, corrects inventory on FAIL
   * (D-004), completes the pending task, and recomputes the bin's score (D-005).
   */
  async submitCount(
    code: string,
    request: SubmitCountRequest,
  ): Promise<CountResultResponse> {
    const found = await this.prisma.bin.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(`Bin ${code} not found`);
    const binId = found.id;

    return this.prisma.$transaction(
      async (tx) => {
        const countedAt = new Date();

        // 1. First write: lock the bin, so a concurrent recompute either finishes
        //    before us or waits and scores the audited inputs.
        const bin = await tx.bin.update({
          where: { id: binId },
          data: { lastAuditedAt: countedAt },
          select: {
            currentScore: { select: { score: true } },
            tasks: PENDING_TASK_SELECT,
          },
        });

        // 2. Read the bin's lines under a row lock and check them against the sheet.
        await tx.$queryRaw`
          SELECT pi.id FROM "PalletItem" pi
          JOIN "Pallet" p ON p.id = pi."palletId"
          WHERE p."binId" = ${binId}
          ORDER BY pi.id
          FOR UPDATE OF pi`;
        const items = await tx.palletItem.findMany({
          where: { pallet: { binId }, quantity: { gt: 0 } },
          orderBy: { id: 'asc' },
          select: {
            id: true,
            quantity: true,
            pallet: { select: { id: true, code: true } },
            product: { select: { id: true, sku: true, name: true } },
          },
        });
        const mismatch = findSheetMismatch(
          request.lines,
          items.map((item) => ({
            palletItemId: item.id,
            expectedQty: item.quantity,
          })),
        );
        if (mismatch) {
          throw new ConflictException(
            `${mismatch}. The inventory changed; reload the count sheet.`,
          );
        }

        const countedById = new Map(
          request.lines.map((line) => [line.palletItemId, line.countedQty]),
        );
        const lines: SavedLine[] = items
          .map((item) => ({
            palletItemId: item.id,
            palletId: item.pallet.id,
            palletCode: item.pallet.code,
            productId: item.product.id,
            sku: item.product.sku,
            name: item.product.name,
            expectedQty: item.quantity,
            // Present for every item: findSheetMismatch checked the line sets.
            countedQty: countedById.get(item.id) ?? item.quantity,
          }))
          .sort(
            (a, b) =>
              a.palletCode.localeCompare(b.palletCode) ||
              a.sku.localeCompare(b.sku),
          );
        const evaluation = evaluateCount(lines, COUNT_CONFIG.toleranceUnits);
        const task = bin.tasks[0] ?? null;

        // 3. The result, with a snapshot of every line.
        const result = await tx.auditResult.create({
          data: {
            binId,
            taskId: task?.id ?? null,
            autoOutcome: evaluation.autoOutcome,
            finalOutcome: request.finalOutcome,
            totalExpected: evaluation.totalExpected,
            totalCounted: evaluation.totalCounted,
            discrepancyRatio: evaluation.discrepancyRatio,
            countedAt,
            lines: {
              create: evaluation.lines.map((line) => ({
                palletId: line.palletId,
                productId: line.productId,
                expectedQty: line.expectedQty,
                countedQty: line.countedQty,
                difference: line.difference,
              })),
            },
          },
          select: { id: true },
        });

        // 4. FAIL corrects inventory; PASS (even an override) only records (D-004).
        const mismatched =
          request.finalOutcome === 'FAIL'
            ? evaluation.lines.filter((line) => line.difference !== 0)
            : [];
        if (mismatched.length > 0) {
          await tx.movement.createMany({
            data: mismatched.map((line) => ({
              type: 'ADJUSTMENT' as const,
              binId,
              palletId: line.palletId,
              productId: line.productId,
              quantityDelta: line.difference,
              auditResultId: result.id,
              occurredAt: countedAt,
            })),
          });
          for (const line of mismatched) {
            await tx.palletItem.update({
              where: { id: line.palletItemId },
              data: { quantity: line.countedQty },
            });
          }
        }

        // 5. Complete the task this count answers, if any.
        if (task) {
          await tx.auditTask.update({
            where: { id: task.id },
            data: { status: 'DONE', completedAt: countedAt },
          });
        }

        // 6. Recompute only this bin, linked to the result (D-005).
        await this.scoring.recomputeBin(binId, 'AUDIT', result.id, tx);
        const scored = await tx.bin.findUniqueOrThrow({
          where: { id: binId },
          select: { currentScore: { select: { score: true } } },
        });
        if (!scored.currentScore)
          throw new Error(`Bin ${binId} was not scored`);

        return toCountResult({
          auditResultId: result.id,
          binCode: code,
          finalOutcome: request.finalOutcome,
          countedAt,
          evaluation,
          adjustmentsCreated: mismatched.length,
          completedTask: task,
          previousScore: bin.currentScore?.score ?? null,
          newScore: scored.currentScore.score,
        });
      },
      { timeout: TX_TIMEOUT_MS },
    );
  }
}
