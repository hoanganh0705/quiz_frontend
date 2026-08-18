

import {
finalizeDeletedAccountAuthMarkers,
} from '@/features/auth/lifecycle/deletion-auth-markers';
import {
clearAllDeletionCaches,
} from '@/features/auth/lifecycle/deletion-cache-cleanup';
import {
clearDeletionPersistedAccountState,
} from '@/features/auth/lifecycle/deletion-persisted-state';
import {
broadcastAccountDeleted,
} from '@/lib/api/core/broadcast-channel';
import { markDeletionTerminal } from '@/features/auth/lifecycle/deletion-terminal';
import { logger } from '@/shared/log';

let deletionFinalized = false;

export function isDeletionFinalized(): boolean {
return deletionFinalized;
}

export function resetDeletionFinalizationForTesting(): void {
deletionFinalized = false;
}

export interface DeletionFinalizationResult {
alreadyFinalized: boolean;
errors: ReadonlyArray<{ step: DeletionCleanupStep; cause: unknown }>;
}

export type DeletionCleanupStep =
| 'clearAuthMarkers'
  | 'clearAllDeletionCaches'
  | 'clearPersistedAccountState'
  | 'broadcastDeletion'
  | 'replaceHistory';

function recordError(
errors: Array<{ step: DeletionCleanupStep; cause: unknown }>,
step: DeletionCleanupStep,
cause: unknown,
): void {
logger.warn('auth.deletion', 'cleanup step failed', { step, cause });
errors.push({ step, cause });
}

export async function runDeletionFinalization(options?: {
replaceHistory?: () => void;

skipBroadcast?: boolean;
}): Promise<DeletionFinalizationResult> {
if (deletionFinalized) {
return { alreadyFinalized: true, errors: [] };
  }

const errors: Array<{ step: DeletionCleanupStep; cause: unknown }> = [];

deletionFinalized = true;

markDeletionTerminal();

try {
finalizeDeletedAccountAuthMarkers();
  } catch (cause) {
recordError(errors, 'clearAuthMarkers', cause);
  }

try {
clearAllDeletionCaches();
  } catch (cause) {
recordError(errors, 'clearAllDeletionCaches', cause);
  }

try {
clearDeletionPersistedAccountState();
  } catch (cause) {
recordError(errors, 'clearPersistedAccountState', cause);
  }

if (!options?.skipBroadcast) {
try {
broadcastAccountDeleted();
    } catch (cause) {
recordError(errors, 'broadcastDeletion', cause);
    }
  }

if (options?.replaceHistory) {
try {
options.replaceHistory();
    } catch (cause) {
recordError(errors, 'replaceHistory', cause);
    }
  }

return { alreadyFinalized: false, errors };
}
