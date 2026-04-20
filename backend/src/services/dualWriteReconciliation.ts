import logger from '../utils/logger.js';

import { getCollectionAsync } from './cosmosdb.js';

// Transitional compatibility logger only.
// TODO(phase-2): retire this service after legacy bridge dependency reaches zero.

export type DualWriteStatus = 'ok' | 'mismatch' | 'mirror_failed';

export interface DualWriteReconciliationEntry {
  entity: 'post' | 'taxonomy';
  operation: string;
  status: DualWriteStatus;
  entityId?: string;
  primaryId?: string;
  mirrorId?: string;
  summary: string;
  details?: Record<string, unknown>;
}

export async function recordDualWriteReconciliation(entry: DualWriteReconciliationEntry): Promise<void> {
  const payload = {
    ...entry,
    mode: 'dual',
    primary: 'mongo',
    mirror: 'postgres',
    createdAt: new Date(),
  };

  if (entry.status === 'ok') {
    logger.info(payload, '[DualWrite] reconciliation');
  } else if (entry.status === 'mismatch') {
    logger.warn(payload, '[DualWrite] reconciliation mismatch');
  } else {
    logger.error(payload, '[DualWrite] mirror failure');
  }

  try {
    const collection = await getCollectionAsync('content_dual_write_reconciliation');
    await collection.insertOne(payload);
  } catch (error) {
    logger.warn({ err: error, entity: entry.entity, operation: entry.operation }, '[DualWrite] failed to persist reconciliation log');
  }
}
