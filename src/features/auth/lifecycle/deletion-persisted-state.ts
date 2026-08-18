

export const AUTH_PERSISTENT_KEYS: ReadonlyArray<string> = Object.freeze([

'user_store_v1',

'user_settings',
]);

export function clearPersistedUserStore(): boolean {
if (typeof localStorage === 'undefined') return false;

try {
if (localStorage.getItem('user_store_v1') !== null) {
localStorage.removeItem('user_store_v1');
    }
return true;
  } catch {
return false;
  }
}

export function clearDeletionPersistedAccountState(): ReadonlyArray<string> {
if (typeof localStorage === 'undefined') return [];

const removed: string[] = [];
try {
for (const key of AUTH_PERSISTENT_KEYS) {
if (localStorage.getItem(key) !== null) {
localStorage.removeItem(key);
removed.push(key);
      }
    }
  } catch {
    // Storage unavailable — return what we have so far
  }
return removed;
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
setters.setPassword('');
    } catch {
      // Defensive — the setter may not be ready yet
    }
  }
if (setters.setTypedConfirmation) {
try {
setters.setTypedConfirmation('');
    } catch {
      // Defensive — the setter may not be ready yet
    }
  }
}

export function _internalAuthPersistentKeysForTest(): ReadonlyArray<string> {
return AUTH_PERSISTENT_KEYS;
}
