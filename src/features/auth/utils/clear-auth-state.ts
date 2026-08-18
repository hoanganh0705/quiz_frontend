

import { mutate as globalMutate } from 'swr';

import { clearAuthToken } from '@/features/auth/utils/auth-cookies';
import { clearAllAuthCache } from '@/features/auth/utils/user-scoped-cache';
import { clearVerificationFlags } from '@/features/auth/utils/verification-flag';
import { isSafeRedirectTarget } from '@/features/auth/utils/safe-redirect';
import { broadcastAuthEvent } from '@/lib/api/core/broadcast-channel';

export interface ClearAuthStateOptions {

redirectTo?: string | null;

skipBroadcast?: boolean;

skipSwrCacheClear?: boolean;
}

function clearSwrCache(): void {

if (typeof window === 'undefined') return;
try {
void globalMutate(
() => true,
undefined,
{ revalidate: true },
    );
  } catch {
    // SWR's own mutate can throw if its provider is not mounted
    // yet (e.g. very early bootstrap). Fail-open so the rest of
    // the cleanup still runs.
  }
}

export function clearAuthState(options: ClearAuthStateOptions = {}): void {
const { redirectTo = null, skipBroadcast = false, skipSwrCacheClear = false } = options;

try {
clearVerificationFlags();
  } catch {
    // Storage / globals may be unavailable in some test setups;
    // the rest of the cleanup still runs.
  }

try {
clearAuthToken();
  } catch {
    // Same — fail-open so a cookie write error does not block the
    // broadcast / redirect.
  }

try {
clearAllAuthCache();
  } catch {
    // Same — fail-open.
  }

if (!skipSwrCacheClear) {
try {
clearSwrCache();
    } catch {
      // SWR's mutate can throw if its provider is not mounted yet
      // (early bootstrap). The cookie + broadcast cleanup above
      // already runs.
    }
  }

if (!skipBroadcast) {
try {
broadcastAuthEvent({ type: 'LOGGED_OUT' });
    } catch {
      // The broadcast channel may be unavailable in SSR / private
      // browsing; the local cleanup above is sufficient.
    }
  }

if (
typeof redirectTo === 'string' &&
isSafeRedirectTarget(redirectTo) &&
typeof globalThis !== 'undefined' &&
globalThis.location !== undefined &&
typeof globalThis.location.assign === 'function'
  ) {
globalThis.location.assign(redirectTo);
  }
}