import { broadcastAccountDeleted } from "@/lib/api/core/broadcast-channel";
import { getQueryClient } from "@/providers/QueryProvider";

import { clearAuthToken } from "@/features/auth/utils/auth-cookies";
import { clearVerificationFlags } from "@/features/auth/utils/verification-flag";
import { useUserStore } from "@/features/users/store/user-store";

import { logger } from "@/shared/log";

export const AUTH_SYNC_KEYS: ReadonlyArray<string> = Object.freeze([
  "auth_sync_TOKEN_REFRESHED",
  "auth_sync_LOGGED_IN",
  "auth_sync_LOGGED_OUT",
]);

export const AUTH_PERSISTENT_KEYS: ReadonlyArray<string> = Object.freeze([
  "user_store_v1",
  "user_settings",
]);

let deletionFinalized = false;
let deletionTerminal = false;

export function isDeletionFinalized(): boolean {
  return deletionFinalized;
}

export function resetDeletionFinalizationForTesting(): void {
  deletionFinalized = false;
  deletionTerminal = false;
}

export function isDeletionTerminal(): boolean {
  return deletionTerminal;
}

export function markDeletionTerminal(): void {
  deletionTerminal = true;
}

export function clearDeletionTerminal(): void {
  deletionTerminal = false;
}

export function _isDeletionTerminalForTesting(): boolean {
  return deletionTerminal;
}

export interface DeletionFormSetters {
  setPassword: (value: string) => void;
  setTypedConfirmation: (value: string) => void;
}

export function clearSensitiveDeletionFormValues(
  setters: Partial<DeletionFormSetters>,
): void {
  if (setters.setPassword) {
    try {
      setters.setPassword("");
    } catch {
      // Defensive — setter may not be ready
    }
  }
  if (setters.setTypedConfirmation) {
    try {
      setters.setTypedConfirmation("");
    } catch {
      // Defensive — setter may not be ready
    }
  }
}

export function clearPersistedUserStore(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    if (localStorage.getItem("user_store_v1") !== null) {
      localStorage.removeItem("user_store_v1");
    }
    return true;
  } catch {
    return false;
  }
}

export function clearDeletionPersistedAccountState(): ReadonlyArray<string> {
  if (typeof localStorage === "undefined") return [];
  const removed: string[] = [];
  try {
    for (const key of AUTH_PERSISTENT_KEYS) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        removed.push(key);
      }
    }
  } catch {
    // Storage unavailable
  }
  return removed;
}

export function finalizeDeletedAccountAuthMarkers(): void {
  clearVerificationFlags();
  clearAuthToken();

  if (typeof localStorage === "undefined") return;
  try {
    for (const key of AUTH_SYNC_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // Best-effort storage wipe
  }
}

export interface DeletionCacheCleanupReport {
  authCache: { ran: boolean; removedKeys: ReadonlyArray<string> };
  persistedUserStore: { ran: boolean };
  crossTabSyncKeys: { ran: boolean; removedKeys: ReadonlyArray<string> };
  additionalPersistedKeys: { ran: boolean; removedKeys: ReadonlyArray<string> };
  inMemoryUserStore: { ran: boolean };
}

export function clearAllDeletionCaches(): DeletionCacheCleanupReport {
  const removedAuthCacheKeys: string[] = [];
  let authCacheRan = false;
  try {
    if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("auth_cache_")) {
          removedAuthCacheKeys.push(key);
        }
      }
      for (const key of removedAuthCacheKeys) {
        localStorage.removeItem(key);
      }
      authCacheRan = true;
    }
  } catch {
    authCacheRan = false;
  }

  let persistedUserStoreRan = false;
  try {
    persistedUserStoreRan = clearPersistedUserStore();
  } catch {
    persistedUserStoreRan = false;
  }

  const removedCrossTabKeys: string[] = [];
  let crossTabRan = false;
  try {
    if (typeof localStorage !== "undefined") {
      for (const key of AUTH_SYNC_KEYS) {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          removedCrossTabKeys.push(key);
        }
      }
    }
    crossTabRan = true;
  } catch {
    crossTabRan = false;
  }

  const removedAdditionalKeys: string[] = [];
  let additionalRan = false;
  try {
    if (typeof localStorage !== "undefined") {
      for (const key of AUTH_PERSISTENT_KEYS) {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          removedAdditionalKeys.push(key);
        }
      }
    }
    additionalRan = true;
  } catch {
    additionalRan = false;
  }

  let inMemoryUserStoreRan = false;
  try {
    useUserStore.getState().clearUser();
    inMemoryUserStoreRan = true;
  } catch {
    inMemoryUserStoreRan = false;
  }

  return {
    authCache: { ran: authCacheRan, removedKeys: removedAuthCacheKeys },
    persistedUserStore: { ran: persistedUserStoreRan },
    crossTabSyncKeys: { ran: crossTabRan, removedKeys: removedCrossTabKeys },
    additionalPersistedKeys: {
      ran: additionalRan,
      removedKeys: removedAdditionalKeys,
    },
    inMemoryUserStore: { ran: inMemoryUserStoreRan },
  };
}

export interface DeletionFinalizationResult {
  alreadyFinalized: boolean;
  errors: ReadonlyArray<{ step: DeletionCleanupStep; cause: unknown }>;
}

export type DeletionCleanupStep =
  | "clearAuthMarkers"
  | "clearAllDeletionCaches"
  | "clearPersistedAccountState"
  | "broadcastDeletion"
  | "replaceHistory";

function recordError(
  errors: Array<{ step: DeletionCleanupStep; cause: unknown }>,
  step: DeletionCleanupStep,
  cause: unknown,
): void {
  logger.warn("auth.deletion", "cleanup step failed", { step, cause });
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
    recordError(errors, "clearAuthMarkers", cause);
  }

  try {
    clearAllDeletionCaches();
    if (typeof window !== "undefined") {
      getQueryClient().clear();
    }
  } catch (cause) {
    recordError(errors, "clearAllDeletionCaches", cause);
  }

  try {
    clearDeletionPersistedAccountState();
  } catch (cause) {
    recordError(errors, "clearPersistedAccountState", cause);
  }

  if (!options?.skipBroadcast) {
    try {
      broadcastAccountDeleted();
    } catch (cause) {
      recordError(errors, "broadcastDeletion", cause);
    }
  }

  if (options?.replaceHistory) {
    try {
      options.replaceHistory();
    } catch (cause) {
      recordError(errors, "replaceHistory", cause);
    }
  }

  return { alreadyFinalized: false, errors };
}
