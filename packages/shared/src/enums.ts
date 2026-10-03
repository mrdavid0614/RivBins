// String unions mirroring the Prisma enums in apps/api/prisma/schema.prisma.
// Kept as types (not TS enums) so this package has no runtime code.

export type MovementType = 'PUTAWAY' | 'PICK' | 'MOVE' | 'ADJUSTMENT';

export type TaskStatus = 'PENDING' | 'DONE';

export type AuditOutcome = 'PASS' | 'FAIL';

export type ScoreTrigger = 'SEED' | 'MANUAL_RECOMPUTE' | 'AUDIT';
