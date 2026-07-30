/**
 * Cross-tab BroadcastChannel sync suite for `custom-instance`.
 *
 * Source epic: Epic 1.4 — Custom Instance Hardening.
 * Source ticket: TKT-1.4.3.5.
 *
 * The cross-tab BroadcastChannel listener is registered at module-load
 * time inside `if (typeof window !== 'undefined')` (custom-instance.ts:164).
 * In node mode (the default for vitest in this repo), `window` is undefined
 * and the listener block does NOT run.
 *
 * To exercise the listener, we stub `window` and `BroadcastChannel`
 * BEFORE re-importing the module via `await import(...)` so the listener
 * block executes. We capture the `onmessage` handler from a controllable
 * MockBroadcastChannel and invoke it manually to simulate a cross-tab
 * postMessage.
 *
 * `setAuthToken` and `clearAuthToken` are imported by `custom-instance.ts`
 * from `@/features/auth/utils/auth-cookies`. To assert that the listener
 * calls them, we `vi.mock` the auth-cookies module BEFORE the first
 * import. The mock exposes controllable spies that the listener will
 * invoke via the same module reference (ES module caching guarantees a
 * single module instance across imports within the same test file).
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// Mock the auth-cookies module so we can spy on setAuthToken / clearAuthToken.
// This mock is hoisted to the top of the file by vitest's transformer —
// `custom-instance.ts` will see the mocked implementations when imported.
vi.mock('@/features/auth/utils/auth-cookies', () => ({
  getAuthToken: vi.fn(() => null),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  getAuthTokenFromRequest: vi.fn(() => null),
  setRefreshToken: vi.fn(),
  subscribeToAuthChanges: vi.fn(() => () => {}),
}));

// Import after the mock is declared.
import * as authCookies from '@/features/auth/utils/auth-cookies';

interface CapturedMessage {
  type: string;
  accessToken?: string;
  timestamp?: number;
}

describe('custom-instance — cross-tab sync', () => {
  let setAuthTokenSpy: ReturnType<typeof vi.mocked<typeof authCookies.setAuthToken>>;
  let clearAuthTokenSpy: ReturnType<typeof vi.mocked<typeof authCookies.clearAuthToken>>;
  let capturedOnmessage: ((event: { data: CapturedMessage }) => void) | null =
    null;

  beforeEach(async () => {
    // Reset modules so the listener block re-runs on the next import.
    vi.resetModules();

    // Stub window so the listener registration block runs.
    const windowStub = { location: { href: '' } };
    vi.stubGlobal('window', windowStub);

    // Install a controllable BroadcastChannel mock that captures
    // onmessage. The custom-instance listener block runs at module-load
    // time and calls `new BroadcastChannel('auth')`, which our mock
    // intercepts.
    capturedOnmessage = null;
    class MockBroadcastChannel {
      public name: string;
      public postMessage = vi.fn();
      public close = vi.fn();
      private _onmessage:
        | ((event: { data: CapturedMessage }) => void)
        | null = null;

      constructor(name: string) {
        this.name = name;
      }

      set onmessage(handler: ((event: { data: CapturedMessage }) => void) | null) {
        this._onmessage = handler;
        capturedOnmessage = handler;
      }

      get onmessage() {
        return this._onmessage;
      }
    }
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

    // Re-import custom-instance.ts so the listener block runs with our
    // stubs in place. The vi.mock above ensures setAuthToken / clearAuthToken
    // are the mocked versions, so the listener will call the spies.
    setAuthTokenSpy = vi.mocked(authCookies.setAuthToken);
    clearAuthTokenSpy = vi.mocked(authCookies.clearAuthToken);
    setAuthTokenSpy.mockClear();
    clearAuthTokenSpy.mockClear();

    // Dynamic import: this re-evaluates custom-instance.ts in the current
    // module-graph state (with our stubs and mocks).
    await import('./custom-instance');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('captures the onmessage handler at module load', () => {
    expect(capturedOnmessage).not.toBeNull();
  });

  it('handles TOKEN_REFRESHED by calling setAuthToken with the new token', () => {
    expect(capturedOnmessage).not.toBeNull();

    capturedOnmessage!({
      data: {
        type: 'TOKEN_REFRESHED',
        accessToken: 'eyJ.from-other-tab',
        timestamp: Date.now(),
      },
    });

    expect(setAuthTokenSpy).toHaveBeenCalledTimes(1);
    expect(setAuthTokenSpy).toHaveBeenCalledWith('eyJ.from-other-tab');
  });

  it('handles LOGGED_OUT by calling clearAuthToken and redirecting to /login', () => {
    expect(capturedOnmessage).not.toBeNull();

    capturedOnmessage!({
      data: { type: 'LOGGED_OUT' },
    });

    expect(clearAuthTokenSpy).toHaveBeenCalledTimes(1);
    expect(
      (globalThis as { window?: { location: { href: string } } }).window
        ?.location.href
    ).toBe('/login');
  });

  it('ignores messages with unknown event types', () => {
    expect(capturedOnmessage).not.toBeNull();

    capturedOnmessage!({
      data: { type: 'SOMETHING_ELSE' },
    });

    expect(setAuthTokenSpy).not.toHaveBeenCalled();
    expect(clearAuthTokenSpy).not.toHaveBeenCalled();
  });
});