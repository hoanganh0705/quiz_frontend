

import {
afterEach,
beforeEach,
describe,
expect,
it,
vi,
} from 'vitest';

vi.mock('@/features/auth/utils/auth-cookies', () => ({
getAuthToken: vi.fn(() => null),
setAuthToken: vi.fn(),
clearAuthToken: vi.fn(),
getAuthTokenFromRequest: vi.fn(() => null),
setRefreshToken: vi.fn(),
subscribeToAuthChanges: vi.fn(() => () => {}),
writeLoginSync: vi.fn(),
}));

vi.mock('@/features/auth/utils/user-scoped-cache', () => ({
clearAllAuthCache: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
getAuth: vi.fn(() => ({
authControllerRefreshToken: vi.fn(),
  })),
}));

import * as authCookies from '@/features/auth/utils/auth-cookies';

interface CapturedMessage {
type: string;
accessToken?: string;
userId?: string;
timestamp?: number;
tabId?: string;
}

describe('custom-instance — cross-tab sync', () => {
let setAuthTokenSpy: ReturnType<typeof vi.mocked<typeof authCookies.setAuthToken>>;
let clearAuthTokenSpy: ReturnType<typeof vi.mocked<typeof authCookies.clearAuthToken>>;
let capturedMessageListeners: Array<(event: { data: CapturedMessage }) => void> = [];

beforeEach(async () => {

vi.resetModules();

const windowStub = {
location: { href: '' },
addEventListener: vi.fn(),
removeEventListener: vi.fn(),
    };
vi.stubGlobal('window', windowStub);

capturedMessageListeners = [];
class MockBroadcastChannel {
public name: string;
public postMessage = vi.fn();
public close = vi.fn();

constructor(name: string) {
this.name = name;
      }

addEventListener(type: string, listener: (event: { data: CapturedMessage }) => void) {
if (type === 'message') {
capturedMessageListeners.push(listener);
        }
      }

removeEventListener(type: string, listener: (event: { data: CapturedMessage }) => void) {
if (type === 'message') {
capturedMessageListeners = capturedMessageListeners.filter((l) => l !== listener);
        }
      }
    }
vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

setAuthTokenSpy = vi.mocked(authCookies.setAuthToken);
clearAuthTokenSpy = vi.mocked(authCookies.clearAuthToken);
setAuthTokenSpy.mockClear();
clearAuthTokenSpy.mockClear();

await import('./custom-instance');
  });

afterEach(() => {
vi.unstubAllGlobals();
vi.resetModules();
  });

const dispatchMessage = (data: CapturedMessage) => {
capturedMessageListeners.forEach((listener) => {
listener({ data });
    });
  };

it('captures the message handler at module load', () => {
expect(capturedMessageListeners.length).toBeGreaterThan(0);
  });

it('handles TOKEN_REFRESHED from a different tab by calling setAuthToken', () => {
expect(capturedMessageListeners.length).toBeGreaterThan(0);

dispatchMessage({
type: 'TOKEN_REFRESHED',
accessToken: 'eyJ.from-other-tab',
timestamp: Date.now(),
tabId: 'other-tab-id',
    });

expect(setAuthTokenSpy).toHaveBeenCalledWith('eyJ.from-other-tab');
  });

it('handles LOGGED_OUT from a different tab by calling clearAuthToken and redirecting', () => {
expect(capturedMessageListeners.length).toBeGreaterThan(0);

dispatchMessage({
type: 'LOGGED_OUT',
tabId: 'other-tab-id',
    });

expect(clearAuthTokenSpy).toHaveBeenCalled();
expect(
(globalThis as { window?: { location: { href: string } } }).window
?.location.href,
    ).toBe('/login');
  });

it('handles LOGGED_IN from a different tab by calling setAuthToken', () => {
expect(capturedMessageListeners.length).toBeGreaterThan(0);

dispatchMessage({
type: 'LOGGED_IN',
userId: 'user-123',
accessToken: 'eyJ.fresh-login',
timestamp: Date.now(),
tabId: 'other-tab-id',
    });

expect(setAuthTokenSpy).toHaveBeenCalledWith('eyJ.fresh-login');
  });

it('ignores messages from the same tab (same-tab filter)', () => {
expect(capturedMessageListeners.length).toBeGreaterThan(0);

dispatchMessage({
type: 'SOMETHING_ELSE',
    });

expect(setAuthTokenSpy).not.toHaveBeenCalled();
expect(clearAuthTokenSpy).not.toHaveBeenCalled();
  });
});
