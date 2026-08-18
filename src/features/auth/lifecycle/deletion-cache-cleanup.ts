

import { clearAllAuthCache } from "@/features/auth/utils/user-scoped-cache";
import { clearPersistedUserStore } from "./deletion-persisted-state";
import { useUserStore } from "@/features/users/store/user-store";
import { AUTH_PERSISTENT_KEYS } from "./deletion-persisted-state";

const CROSS_TAB_SYNC_KEYS: ReadonlyArray<string> = Object.freeze([
"auth_sync_TOKEN_REFRESHED",
"auth_sync_LOGGED_IN",
"auth_sync_LOGGED_OUT",
]);

export interface DeletionCacheCleanupReport {

authCache: { ran: boolean; removedKeys: ReadonlyArray<string> };

persistedUserStore: { ran: boolean };

crossTabSyncKeys: { ran: boolean; removedKeys: ReadonlyArray<string> };

additionalPersistedKeys: { ran: boolean; removedKeys: ReadonlyArray<string> };

inMemoryUserStore: { ran: boolean };
}

export function clearAllDeletionCaches(): DeletionCacheCleanupReport {

let removedAuthCacheKeys: ReadonlyArray<string> = [];
let authCacheRan = false;
try {
if (typeof localStorage !== "undefined") {
const before: string[] = [];
for (let i = 0; i < localStorage.length; i++) {
const key = localStorage.key(i);
if (key && key.startsWith("auth_cache_")) before.push(key);
      }
clearAllAuthCache();
removedAuthCacheKeys = before;
authCacheRan = true;
    } else {
authCacheRan = false;
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
for (const key of CROSS_TAB_SYNC_KEYS) {
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

export const _internalCrossTabKeysForTest = CROSS_TAB_SYNC_KEYS;
