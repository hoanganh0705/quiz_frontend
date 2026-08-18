

import {
cancelInFlightRefresh,
} from '@/lib/api/core/custom-instance';
import { clearVerificationFlags } from '@/features/auth/utils/verification-flag';
import {
clearAuthToken,
} from '@/features/auth/utils/auth-cookies';
import { clearAllAuthCache } from '@/features/auth/utils/user-scoped-cache';
import { runDeletionFinalization } from '@/features/auth/lifecycle/deletion-finalization';
import {
buildDeletionReplaceHistory,
} from '@/features/auth/lifecycle/deletion-history';
import { markDeletionTerminal } from '@/features/auth/lifecycle/deletion-terminal';
import { isInCooldown, clearCooldown } from '@/lib/api/core/refresh-cooldown';
import type { AuthEvent } from '@/lib/api/core/broadcast-channel';

export function handleRemoteAccountDeleted(event: AuthEvent): void {
void event;

markDeletionTerminal();

cancelInFlightRefresh();

if (isInCooldown()) {
clearCooldown();
  }

clearVerificationFlags();

clearAuthToken();

clearAllAuthCache();

void runDeletionFinalization({

replaceHistory: undefined,
skipBroadcast: true,
  });

try {
const replace = buildDeletionReplaceHistory();
replace();
  } catch {
    // Best-effort: the guard's `router.replace` is the
    // authoritative navigation that follows this step.
  }
}
