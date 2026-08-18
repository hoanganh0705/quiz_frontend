

const STORAGE_PREFIX = 'auth_sync_';
const STORAGE_KEY_LOGIN = `${STORAGE_PREFIX}LOGGED_IN`;
const STORAGE_KEY_LOGOUT = `${STORAGE_PREFIX}LOGGED_OUT`;
const STORAGE_KEY_TOKEN_REFRESHED = `${STORAGE_PREFIX}TOKEN_REFRESHED`;

const DEFAULT_TAB_ID = 'storage';

import { logger } from '@/shared/log';

export interface SyncPayload {
type: 'LOGGED_IN' | 'LOGGED_OUT' | 'TOKEN_REFRESHED';
tabId: string;
timestamp: number;
accessToken?: string;
userId?: string;
}

type SyncHandler = (payload: SyncPayload) => void;

const syncHandlers = new Set<SyncHandler>();

let initialized = false;

export function initStorageSync(): boolean {
if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
return false;
  }

if (initialized) {
return true;
  }

window.addEventListener('storage', handleStorageEvent);
initialized = true;

return true;
}

export function cleanupStorageSync(): void {
if (typeof window !== 'undefined') {
window.removeEventListener('storage', handleStorageEvent);
  }
syncHandlers.clear();
initialized = false;
}

function handleStorageEvent(event: StorageEvent): void {
if (!event.key) return;

if (!event.key.startsWith(STORAGE_PREFIX)) return;

if (
event.key !== STORAGE_KEY_LOGIN &&
event.key !== STORAGE_KEY_LOGOUT &&
event.key !== STORAGE_KEY_TOKEN_REFRESHED
  ) {
return;
  }

if (!event.newValue) return;

let payload: SyncPayload;
try {
payload = JSON.parse(event.newValue) as SyncPayload;
  } catch {
return;
  }

if (!payload.type || !payload.tabId || !payload.timestamp) {
return;
  }

syncHandlers.forEach((handler) => {
try {
handler(payload);
    } catch (err) {
logger.error('auth.storage-sync', 'Error in storage sync handler', err);
    }
  });
}

export function subscribeToStorageSync(handler: SyncHandler): () => void {
syncHandlers.add(handler);

initStorageSync();

return () => {
syncHandlers.delete(handler);
  };
}

export function broadcastLoginViaStorage(
userId: string,
accessToken: string,
tabId: string = DEFAULT_TAB_ID,
): void {
if (typeof localStorage === 'undefined') return;

const payload: SyncPayload = {
type: 'LOGGED_IN',
tabId,
timestamp: Date.now(),
userId,
accessToken,
  };

try {
localStorage.setItem(STORAGE_KEY_LOGIN, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function broadcastLogoutViaStorage(
tabId: string = DEFAULT_TAB_ID,
): void {
if (typeof localStorage === 'undefined') return;

const payload: SyncPayload = {
type: 'LOGGED_OUT',
tabId,
timestamp: Date.now(),
  };

try {
localStorage.setItem(STORAGE_KEY_LOGOUT, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function broadcastTokenRefreshedViaStorage(
accessToken: string,
tabId: string = DEFAULT_TAB_ID,
): void {
if (typeof localStorage === 'undefined') return;

const payload: SyncPayload = {
type: 'TOKEN_REFRESHED',
tabId,
timestamp: Date.now(),
accessToken,
  };

try {
localStorage.setItem(STORAGE_KEY_TOKEN_REFRESHED, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function getStorageSyncTabId(): string {
if (typeof sessionStorage === 'undefined') return DEFAULT_TAB_ID;

const stored = sessionStorage.getItem('auth_tab_id');
if (stored) return stored;

const newId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
try {
sessionStorage.setItem('auth_tab_id', newId);
  } catch {
    // Ignore
  }
return newId;
}
