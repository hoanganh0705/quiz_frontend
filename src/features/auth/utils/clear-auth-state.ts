import { broadcastAuthEvent } from "@/lib/api/core/broadcast-channel";
import { getQueryClient } from "@/providers/QueryProvider";

import { clearAuthToken } from "@/features/auth/utils/auth-cookies";
import { clearVerificationFlags } from "@/features/auth/utils/verification-flag";

import { isSafeRedirectTarget } from "@/shared/config/routes";

export interface ClearAuthStateOptions {
  redirectTo?: string | null;
  skipBroadcast?: boolean;
  skipCacheClear?: boolean;
}

export function clearAuthState(options: ClearAuthStateOptions = {}): void {
  const {
    redirectTo = null,
    skipBroadcast = false,
    skipCacheClear = false,
  } = options;

  try {
    clearVerificationFlags();
  } catch {
    // Storage / globals may be unavailable in some test setups;
    // the rest of the cleanup still runs.
  }

  try {
    clearAuthToken();
  } catch {
    // Fail-open so a cookie write error does not block the broadcast / redirect.
  }

  if (!skipCacheClear) {
    try {
      getQueryClient().clear();
    } catch {
      // Fail-open
    }
  }

  if (!skipBroadcast) {
    try {
      broadcastAuthEvent({ type: "LOGGED_OUT" });
    } catch {
      // The broadcast channel may be unavailable in SSR / private
      // browsing; the local cleanup above is sufficient.
    }
  }

  if (
    typeof redirectTo === "string" &&
    isSafeRedirectTarget(redirectTo) &&
    typeof globalThis !== "undefined" &&
    globalThis.location !== undefined &&
    typeof globalThis.location.assign === "function"
  ) {
    globalThis.location.assign(redirectTo);
  }
}
