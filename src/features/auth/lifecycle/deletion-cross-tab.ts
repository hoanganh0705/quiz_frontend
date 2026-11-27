import { cancelInFlightRefresh } from "@/lib/api/core/custom-instance";
import { clearCooldown, isInCooldown } from "@/lib/api/core/refresh-cooldown";

import {
  markDeletionTerminal,
  runDeletionFinalization,
} from "@/features/auth/lifecycle/deletion-finalization";
import { buildDeletionReplaceHistory } from "@/features/auth/lifecycle/deletion-history";
import { clearAuthToken } from "@/features/auth/utils/auth-cookies";
import { clearVerificationFlags } from "@/features/auth/utils/verification-flag";

import type { AuthEvent } from "@/lib/api/core/broadcast-channel";

export function handleRemoteAccountDeleted(event: AuthEvent): void {
  void event;

  markDeletionTerminal();
  cancelInFlightRefresh();

  if (isInCooldown()) {
    clearCooldown();
  }

  clearVerificationFlags();
  clearAuthToken();

  void runDeletionFinalization({
    replaceHistory: undefined,
    skipBroadcast: true,
  });

  try {
    const replace = buildDeletionReplaceHistory();
    replace();
  } catch {
    // Best-effort: the guard's router.replace is authoritative
  }
}
