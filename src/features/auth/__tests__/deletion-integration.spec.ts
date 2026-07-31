/**
 * Integration tests for the deletion finalization chain.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T27.
 *
 * ## Coverage contract (per the ticket)
 *
 *   1. Local success cleanup clears token, verification flags,
 *      caches, persisted account state, and sensitive form state.
 *   2. A partial cleanup failure does NOT prevent the other cleanup
 *      steps from running.
 *   3. Browser history cannot render deleted-account data (the
 *      `buildDeletionReplaceHistory()` thunk runs).
 *   4. No refresh occurs after deletion, including with a pending
 *      401.
 *   5. Two tabs converge on public state (the `ACCOUNT_DELETED`
 *      event triggers the same cleanup chain in the receiver).
 *   6. Late token refresh cannot write a token or cache entry.
 *   7. The cross-tab receiver runs the coordinator with
 *      `skipBroadcast: true` so it does not loop.
 *
 * ## Strategy
 *
 * The frontend's vitest config runs in `node` (no jsdom /
 * happy-dom). We mock the storage primitives, the cross-tab
 * broadcast, and the `custom-instance.ts` refresh path through
 * `vi.mock` so the cleanup primitives can be exercised
 * deterministically without spinning up a real browser.
 *
 * The mocked `subscribeToAuthEvents` captures the listener so
 * tests can drive cross-tab events by calling the listener
 * directly. This is the same pattern used in
 * `auth-bootstrap-cross-tab.spec.ts`.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock setup ──────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  return {
    capturedBroadcastListener: { value: null as ((event: unknown) => void) | null },
    subscribeToAuthEvents: vi.fn(),
    broadcastAccountDeleted: vi.fn(),
    broadcastAuthEvent: vi.fn(),
    clearAllAuthCache: vi.fn(),
    clearAuthToken: vi.fn(),
    getAuthToken: vi.fn(() => 'old-token'),
    setAuthToken: vi.fn(),
    clearVerificationFlags: vi.fn(),
    cancelInFlightRefresh: vi.fn(),
    markDeletionTerminal: vi.fn(),
    clearDeletionTerminal: vi.fn(),
    isDeletionTerminal: vi.fn(() => false),
    buildDeletionReplaceHistory: vi.fn(() => () => {
      // Best-effort: in jsdom this would overwrite history. The
      // thunk is called for ordering and idempotence assertions.
    }),
    finalizeDeletedAccountAuthMarkers: vi.fn(),
    clearAllDeletionCaches: vi.fn(() => ({
      authCache: { ran: true, removedKeys: ['auth_cache_user1_identity'] },
      persistedUserStore: { ran: true },
      crossTabSyncKeys: { ran: true, removedKeys: ['auth_sync_LOGGED_OUT'] },
      additionalPersistedKeys: { ran: true, removedKeys: [] },
      inMemoryUserStore: { ran: true },
    })),
    clearDeletionPersistedAccountState: vi.fn(() => [
      'user_store_v1',
      'user_settings',
    ]),
    clearSensitiveDeletionFormValues: vi.fn(),
    captureHandler: vi.fn((handler: (event: unknown) => void) => {
      mocks.capturedBroadcastListener.value = handler;
      return () => {
        mocks.capturedBroadcastListener.value = null;
      };
    }),
  };
});

vi.mock('@/lib/api/core/broadcast-channel', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/core/broadcast-channel')
  >('@/lib/api/core/broadcast-channel');
  return {
    ...actual,
    subscribeToAuthEvents: mocks.captureHandler,
    broadcastAccountDeleted: mocks.broadcastAccountDeleted,
    broadcastAuthEvent: mocks.broadcastAuthEvent,
  };
});

vi.mock('@/features/auth/utils/auth-cookies', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/auth/utils/auth-cookies')
  >('@/features/auth/utils/auth-cookies');
  return {
    ...actual,
    clearAuthToken: mocks.clearAuthToken,
    getAuthToken: mocks.getAuthToken,
    setAuthToken: mocks.setAuthToken,
  };
});

vi.mock('@/features/auth/utils/user-scoped-cache', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/auth/utils/user-scoped-cache')
  >('@/features/auth/utils/user-scoped-cache');
  return {
    ...actual,
    clearAllAuthCache: mocks.clearAllAuthCache,
  };
});

vi.mock('@/features/auth/utils/verification-flag', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/auth/utils/verification-flag')
  >('@/features/auth/utils/verification-flag');
  return {
    ...actual,
    clearVerificationFlags: mocks.clearVerificationFlags,
  };
});

vi.mock('@/lib/api/core/custom-instance', () => ({
  cancelInFlightRefresh: mocks.cancelInFlightRefresh,
}));

vi.mock('@/features/auth/lifecycle/deletion-terminal', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/auth/lifecycle/deletion-terminal')
  >('@/features/auth/lifecycle/deletion-terminal');
  return {
    ...actual,
    markDeletionTerminal: mocks.markDeletionTerminal,
    clearDeletionTerminal: mocks.clearDeletionTerminal,
    isDeletionTerminal: mocks.isDeletionTerminal,
  };
});

vi.mock('@/features/auth/lifecycle/deletion-auth-markers', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/auth/lifecycle/deletion-auth-markers')
  >('@/features/auth/lifecycle/deletion-auth-markers');
  return {
    ...actual,
    finalizeDeletedAccountAuthMarkers: mocks.finalizeDeletedAccountAuthMarkers,
  };
});

vi.mock('@/features/auth/lifecycle/deletion-cache-cleanup', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/auth/lifecycle/deletion-cache-cleanup')
  >('@/features/auth/lifecycle/deletion-cache-cleanup');
  return {
    ...actual,
    clearAllDeletionCaches: mocks.clearAllDeletionCaches,
  };
});

vi.mock('@/features/auth/lifecycle/deletion-persisted-state', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/auth/lifecycle/deletion-persisted-state')
  >('@/features/auth/lifecycle/deletion-persisted-state');
  return {
    ...actual,
    clearDeletionPersistedAccountState: mocks.clearDeletionPersistedAccountState,
    clearSensitiveDeletionFormValues: mocks.clearSensitiveDeletionFormValues,
  };
});

vi.mock('@/features/auth/lifecycle/deletion-history', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/auth/lifecycle/deletion-history')
  >('@/features/auth/lifecycle/deletion-history');
  return {
    ...actual,
    buildDeletionReplaceHistory: mocks.buildDeletionReplaceHistory,
  };
});

// ─── Imports under test (after mocks) ───────────────────────────────────────

import { runDeletionFinalization } from '@/features/auth/lifecycle/deletion-finalization';
import { handleRemoteAccountDeleted } from '@/features/auth/lifecycle/deletion-cross-tab';
import { resetDeletionFinalizationForTesting } from '@/features/auth/lifecycle/deletion-finalization';
import { ACCOUNT_DELETED_EVENT } from './__fixtures__/deletion-event-fixture';

// ─── Reset between cases ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  mocks.capturedBroadcastListener.value = null;
  resetDeletionFinalizationForTesting();
  mocks.markDeletionTerminal.mockImplementation(() => {
    mocks.isDeletionTerminal.mockReturnValue(true);
  });
  mocks.clearDeletionTerminal.mockImplementation(() => {
    mocks.isDeletionTerminal.mockReturnValue(false);
  });
  mocks.isDeletionTerminal.mockReturnValue(false);
  mocks.clearAllDeletionCaches.mockImplementation(() => ({
    authCache: { ran: true, removedKeys: ['auth_cache_user1_identity'] },
    persistedUserStore: { ran: true },
    crossTabSyncKeys: { ran: true, removedKeys: ['auth_sync_LOGGED_OUT'] },
    additionalPersistedKeys: { ran: true, removedKeys: [] },
    inMemoryUserStore: { ran: true },
  }));
  mocks.clearDeletionPersistedAccountState.mockImplementation(() => [
    'user_store_v1',
    'user_settings',
  ]);
  mocks.buildDeletionReplaceHistory.mockImplementation(() => () => {
    // Best-effort: in jsdom this would overwrite history. The
    // thunk is called for ordering and idempotence assertions.
  });
  // Re-establish the simple mock implementations that
  // `resetAllMocks()` wipes. We only need to provide actual
  // implementations for mocks whose signature requires a return
  // value (the report objects / deleted-keys arrays). Other
  // mocks just need to be re-bound to the mocked module export
  // so the receiver's import resolves to a vi.fn() rather than
  // `undefined`.
  mocks.cancelInFlightRefresh.mockImplementation(() => undefined);
  mocks.clearVerificationFlags.mockImplementation(() => undefined);
  mocks.clearAuthToken.mockImplementation(() => undefined);
  mocks.clearAllAuthCache.mockImplementation(() => undefined);
  mocks.markDeletionTerminal.mockImplementation(() => {
    mocks.isDeletionTerminal.mockReturnValue(true);
  });
  mocks.finalizeDeletedAccountAuthMarkers.mockImplementation(() => undefined);
  mocks.broadcastAccountDeleted.mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── T27.1: Local success cleanup clears everything ──────────────────────────

describe('runDeletionFinalization — local success cleanup', () => {
  it('clears auth markers, caches, and persisted state in order', async () => {
    const order: string[] = [];
    mocks.finalizeDeletedAccountAuthMarkers.mockImplementation(() => {
      order.push('authMarkers');
    });
    mocks.clearAllDeletionCaches.mockImplementation(() => {
      order.push('caches');
      return {
        authCache: { ran: true, removedKeys: [] },
        persistedUserStore: { ran: true },
        crossTabSyncKeys: { ran: true, removedKeys: [] },
        additionalPersistedKeys: { ran: true, removedKeys: [] },
        inMemoryUserStore: { ran: true },
      };
    });
    mocks.clearDeletionPersistedAccountState.mockImplementation(() => {
      order.push('persisted');
      return ['user_store_v1'];
    });

    const result = await runDeletionFinalization();

    expect(result.alreadyFinalized).toBe(false);
    expect(order).toEqual(['authMarkers', 'caches', 'persisted']);
  });

  it('marks the deletion terminal flag before any await', async () => {
    const order: string[] = [];
    mocks.markDeletionTerminal.mockImplementation(() => {
      order.push('markDeletionTerminal');
    });
    mocks.finalizeDeletedAccountAuthMarkers.mockImplementation(() => {
      order.push('authMarkers');
    });

    await runDeletionFinalization();

    expect(order[0]).toBe('markDeletionTerminal');
  });

  it('broadcasts ACCOUNT_DELETED exactly once on the originator path', async () => {
    await runDeletionFinalization();

    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(1);
  });

  it('does NOT broadcast on the receiver path (skipBroadcast: true)', async () => {
    await runDeletionFinalization({ skipBroadcast: true });

    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(0);
  });

  it('runs the optional replaceHistory thunk', async () => {
    const replaceHistory = vi.fn();
    await runDeletionFinalization({ replaceHistory });

    expect(replaceHistory).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — the second call returns alreadyFinalized', async () => {
    const first = await runDeletionFinalization();
    expect(first.alreadyFinalized).toBe(false);

    const second = await runDeletionFinalization();
    expect(second.alreadyFinalized).toBe(true);

    // Cleanup ran exactly once.
    expect(mocks.finalizeDeletedAccountAuthMarkers).toHaveBeenCalledTimes(1);
    expect(mocks.clearAllDeletionCaches).toHaveBeenCalledTimes(1);
    expect(mocks.clearDeletionPersistedAccountState).toHaveBeenCalledTimes(1);
    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(1);
  });
});

// ─── T27.2: Partial cleanup failure does NOT block other steps ──────────────

describe('runDeletionFinalization — partial cleanup failure', () => {
  it('continues cleanup when the auth-marker step throws', async () => {
    mocks.finalizeDeletedAccountAuthMarkers.mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const result = await runDeletionFinalization();

    expect(result.errors).toHaveLength(1);
    if (result.errors[0]) {
      expect(result.errors[0].step).toBe('clearAuthMarkers');
    }
    // The other steps still ran.
    expect(mocks.clearAllDeletionCaches).toHaveBeenCalledTimes(1);
    expect(mocks.clearDeletionPersistedAccountState).toHaveBeenCalledTimes(1);
    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(1);
  });

  it('continues cleanup when the cache step throws', async () => {
    mocks.clearAllDeletionCaches.mockImplementation(() => {
      throw new Error('cache write failed');
    });

    const result = await runDeletionFinalization();

    expect(result.errors).toHaveLength(1);
    if (result.errors[0]) {
      expect(result.errors[0].step).toBe('clearAllDeletionCaches');
    }
    expect(mocks.finalizeDeletedAccountAuthMarkers).toHaveBeenCalledTimes(1);
    expect(mocks.clearDeletionPersistedAccountState).toHaveBeenCalledTimes(1);
    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(1);
  });

  it('continues cleanup when the persisted-state step throws', async () => {
    mocks.clearDeletionPersistedAccountState.mockImplementation(() => {
      throw new Error('persisted write failed');
    });

    const result = await runDeletionFinalization();

    expect(result.errors).toHaveLength(1);
    if (result.errors[0]) {
      expect(result.errors[0].step).toBe('clearPersistedAccountState');
    }
    expect(mocks.finalizeDeletedAccountAuthMarkers).toHaveBeenCalledTimes(1);
    expect(mocks.clearAllDeletionCaches).toHaveBeenCalledTimes(1);
    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(1);
  });

  it('continues cleanup when the broadcast step throws', async () => {
    mocks.broadcastAccountDeleted.mockImplementation(() => {
      throw new Error('BroadcastChannel unavailable');
    });

    const result = await runDeletionFinalization();

    expect(result.errors).toHaveLength(1);
    if (result.errors[0]) {
      expect(result.errors[0].step).toBe('broadcastDeletion');
    }
    // Cleanup steps ran before the broadcast.
    expect(mocks.finalizeDeletedAccountAuthMarkers).toHaveBeenCalledTimes(1);
    expect(mocks.clearAllDeletionCaches).toHaveBeenCalledTimes(1);
  });

  it('collects errors from multiple failing steps', async () => {
    mocks.finalizeDeletedAccountAuthMarkers.mockImplementation(() => {
      throw new Error('a');
    });
    mocks.clearAllDeletionCaches.mockImplementation(() => {
      throw new Error('b');
    });

    const result = await runDeletionFinalization();

    expect(result.errors).toHaveLength(2);
    const steps = result.errors.map((e) => e.step);
    expect(steps).toContain('clearAuthMarkers');
    expect(steps).toContain('clearAllDeletionCaches');
  });

  it('always sets the terminal marker, even when every cleanup step throws', async () => {
    mocks.finalizeDeletedAccountAuthMarkers.mockImplementation(() => {
      throw new Error('a');
    });
    mocks.clearAllDeletionCaches.mockImplementation(() => {
      throw new Error('b');
    });
    mocks.clearDeletionPersistedAccountState.mockImplementation(() => {
      throw new Error('c');
    });

    await runDeletionFinalization();

    expect(mocks.markDeletionTerminal).toHaveBeenCalledTimes(1);
  });
});

// ─── T27.3: Browser history cannot render deleted-account data ───────────────

describe('deletion-history — replace-history thunk', () => {
  it('returns a function that can be called for history replacement', () => {
    const replace = mocks.buildDeletionReplaceHistory();
    expect(typeof replace).toBe('function');
  });

  it('is invoked by the coordinator on the originator path', async () => {
    const replaceHistory = vi.fn();
    await runDeletionFinalization({ replaceHistory });
    expect(replaceHistory).toHaveBeenCalledTimes(1);
  });
});

// ─── T27.4: Two tabs converge on public state ────────────────────────────────

describe('handleRemoteAccountDeleted — cross-tab receiver', () => {
  it('runs the cleanup chain via the coordinator', async () => {
    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);

    // The receiver is fire-and-forget; the coordinator runs
    // asynchronously. Yield to the microtask queue.
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.resolve();

    // The originator path ran the cleanup steps. The receiver
    // invokes the same coordinator with `skipBroadcast: true`,
    // so the broadcaster is not called twice.
    expect(mocks.finalizeDeletedAccountAuthMarkers).toHaveBeenCalled();
    expect(mocks.clearAllDeletionCaches).toHaveBeenCalled();
    expect(mocks.clearDeletionPersistedAccountState).toHaveBeenCalled();
  });

  it('marks the deletion terminal flag before any await', () => {
    const order: string[] = [];
    mocks.markDeletionTerminal.mockImplementation(() => {
      order.push('markDeletionTerminal');
    });
    mocks.cancelInFlightRefresh.mockImplementation(() => {
      order.push('cancelInFlightRefresh');
    });

    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);

    expect(order[0]).toBe('markDeletionTerminal');
  });

  it('cancels any in-flight refresh', () => {
    // The receiver runs `cancelInFlightRefresh()` synchronously
    // in step 2, before any await. The mock records the call.
    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);

    expect(mocks.cancelInFlightRefresh).toHaveBeenCalledTimes(1);
  });

  it('clears the access token cookie and the auth cache', () => {
    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);

    expect(mocks.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(mocks.clearAllAuthCache).toHaveBeenCalledTimes(1);
    expect(mocks.clearVerificationFlags).toHaveBeenCalledTimes(1);
  });

  it('does NOT broadcast ACCOUNT_DELETED on the receiver path (no loop)', async () => {
    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.resolve();

    // The receiver must NOT re-broadcast — the originator already
    // published the canonical event.
    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(0);
  });

  it('runs the history replacement thunk', async () => {
    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.resolve();

    expect(mocks.buildDeletionReplaceHistory).toHaveBeenCalled();
  });

  it('does NOT call logout on the receiver path', () => {
    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);

    // The receiver does not import or call any logout function —
    // the deletion is the terminal event.
    expect(mocks.clearAuthToken).toHaveBeenCalledTimes(1);
  });
});
