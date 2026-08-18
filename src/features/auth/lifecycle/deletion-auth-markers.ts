

import { clearAuthToken } from '@/features/auth/utils/auth-cookies';
import { clearVerificationFlags } from '@/features/auth/utils/verification-flag';

const AUTH_SYNC_KEYS: ReadonlyArray<string> = [
'auth_sync_TOKEN_REFRESHED',
'auth_sync_LOGGED_IN',
'auth_sync_LOGGED_OUT',
];

export function finalizeDeletedAccountAuthMarkers(): void {
clearVerificationFlags();
clearAuthToken();

if (typeof localStorage === 'undefined') return;

try {
for (const key of AUTH_SYNC_KEYS) {
localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable — fail silently. The cookie clear is the
    // authoritative cleanup; the storage-key wipe is best-effort.
  }
}

export function _internalAuthSyncKeysForTest(): ReadonlyArray<string> {
return AUTH_SYNC_KEYS;
}
