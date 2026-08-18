

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { useUnreadNotificationCount } from '@/features/notifications/hooks/useUnreadNotificationCount';

const mockGetFeatureFlagValue = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetUnreadCount = vi.fn();
vi.mock('@/features/notifications/services/notifications.service', () => ({
getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
}));

const mockUseSocket = vi.fn();
type CapturedHandler = (payload: unknown) => void;
const mockUseRealtimeEvent = vi.fn();
const capturedHandlers: { event: string | null; handler: CapturedHandler }[] = [];

vi.mock('@/lib/realtime', async () => {
const actual = await vi.importActual<typeof import('@/lib/realtime')>('@/lib/realtime');
return {
...actual,
useSocket: (...args: unknown[]) => mockUseSocket(...args),
useRealtimeEvent: (
socket: unknown,
event: string | null,
handler: CapturedHandler,
options?: { enabled?: boolean },
    ) => {

if (event !== null && options?.enabled !== false) {
capturedHandlers.push({ event, handler });
      }
return mockUseRealtimeEvent(socket, event, handler, options);
    },
  };
});

function emitEvent(event: string, payload: unknown): void {
const target = capturedHandlers.filter((h) => h.event === event);
for (const h of target) {
h.handler(payload);
  }
}

function clearCapturedHandlers(): void {
capturedHandlers.length = 0;
}

function setupSocketMocks() {
mockUseSocket.mockReturnValue({
socket: null,
connectionState: 'idle',
error: null,
reconnect: vi.fn(),
disconnect: vi.fn(),
  });
mockUseRealtimeEvent.mockImplementation(() => undefined);
clearCapturedHandlers();
}

function TestSwrProvider({ children }: { children: React.ReactNode }) {
return (
<SWRConfig
value={{
provider: () => new Map(),
revalidateOnFocus: false,
revalidateIfStale: false,
dedupingInterval: 0,
errorRetryCount: 0,
      }}
    >
{children}
</SWRConfig>
  );
}

describe('useUnreadNotificationCount', () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue('live');
setupSocketMocks();
  });

afterEach(() => {
cleanup();
  });

describe('feature flag gating', () => {
it('returns zero when flag is placeholder', () => {
mockGetFeatureFlagValue.mockReturnValue('placeholder');

const { result } = renderHook(() => useUnreadNotificationCount(), {
wrapper: TestSwrProvider,
      });

expect(result.current.unreadCount).toBe(0);
    });

it('does not call getUnreadCount when flag is placeholder', async () => {
mockGetFeatureFlagValue.mockReturnValue('placeholder');

renderHook(() => useUnreadNotificationCount(), { wrapper: TestSwrProvider });

await new Promise((resolve) => setTimeout(resolve, 10));
expect(mockGetUnreadCount).not.toHaveBeenCalled();
    });
  });

describe('service forwarding', () => {
it('calls getUnreadCount on mount', async () => {
mockGetUnreadCount.mockResolvedValue({ count: 7 });

const { result } = renderHook(() => useUnreadNotificationCount(), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.unreadCount).toBe(7);
      });

expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
    });

it('returns 0 when service throws', async () => {
mockGetUnreadCount.mockImplementation(() => {
return new Promise((_, reject) => {
queueMicrotask(() => reject(new Error('Server error')));
        });
      });

const { result } = renderHook(() => useUnreadNotificationCount(), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.error).toBeTruthy();
      });

expect(result.current.unreadCount).toBe(0);
    });
  });

describe('count clamp', () => {
it('clamps negative counts at 0', async () => {
mockGetUnreadCount.mockResolvedValue({ count: -5 });

const { result } = renderHook(() => useUnreadNotificationCount(), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.unreadCount).toBe(0);
      });
    });

it('returns 0 when count field is missing', async () => {
mockGetUnreadCount.mockResolvedValue({});

const { result } = renderHook(() => useUnreadNotificationCount(), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.unreadCount).toBe(0);
      });
    });

it('handles service returning null', async () => {
mockGetUnreadCount.mockResolvedValue(null as never);

const { result } = renderHook(() => useUnreadNotificationCount(), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.unreadCount).toBe(0);
      });
    });
  });

describe('socket integration', () => {
it('opens the notifications namespace when feature is live', () => {
mockGetFeatureFlagValue.mockReturnValue('live');

renderHook(() => useUnreadNotificationCount(), { wrapper: TestSwrProvider });

expect(mockUseSocket).toHaveBeenCalledWith(
'/notifications',
expect.objectContaining({ enabled: true }),
      );
    });

it('does not enable the socket when feature flag is placeholder', () => {
mockGetFeatureFlagValue.mockReturnValue('placeholder');

renderHook(() => useUnreadNotificationCount(), { wrapper: TestSwrProvider });

expect(mockUseSocket).toHaveBeenCalledWith(
'/notifications',
expect.objectContaining({ enabled: false }),
      );
    });

it('registers three realtime listeners when connected', () => {
mockUseSocket.mockReturnValue({
socket: { id: 'mock' },
connectionState: 'connected',
error: null,
reconnect: vi.fn(),
disconnect: vi.fn(),
      });

renderHook(() => useUnreadNotificationCount(), { wrapper: TestSwrProvider });

expect(mockUseRealtimeEvent).toHaveBeenCalledTimes(3);
    });
  });

describe('loading state', () => {
it('reports loading while data is pending', async () => {
mockGetUnreadCount.mockReturnValue(new Promise(() => {}));

const { result } = renderHook(() => useUnreadNotificationCount(), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.isLoading).toBe(true);
      });
    });
  });

describe('realtime dedupe (regression: bell stuck at 10)', () => {

function setupConnected(): ReturnType<typeof renderHook<undefined, unknown>> {
mockGetUnreadCount.mockResolvedValue({ count: 3 });
mockUseSocket.mockReturnValue({
socket: { id: 'mock' },
connectionState: 'connected',
error: null,
reconnect: vi.fn(),
disconnect: vi.fn(),
      });
return renderHook(() => useUnreadNotificationCount(), {
wrapper: TestSwrProvider,
      });
    }

it('bumps the count by 1 for a new notification id', async () => {
const { result } = setupConnected();

await waitFor(() => {
expect(result.current.unreadCount).toBe(3);
      });

emitEvent('notification:sent', {
eventType: 'notification.sent',
notificationId: '019ff116-456c-7f1d-b98d-d0675f43fc0e',
userId: 'u1',
type: 'comment_reply',
channel: 'in_app',
timestamp: new Date().toISOString(),
      });

await waitFor(() => {
expect(result.current.unreadCount).toBe(4);
      });
    });

it('does not double-bump for two events with the same notificationId', async () => {
const { result } = setupConnected();

await waitFor(() => {
expect(result.current.unreadCount).toBe(3);
      });

const payload = {
eventType: 'notification.sent',
notificationId: '019ff116-13dc-7fa1-850f-905f62d62870',
userId: 'u1',
type: 'comment_reply',
channel: 'in_app',
timestamp: new Date().toISOString(),
      };

emitEvent('notification:sent', payload);
emitEvent('notification:sent', payload);
emitEvent('notification:sent', payload);

await waitFor(() => {
expect(result.current.unreadCount).toBe(4);
      });
    });

it('does not bump when the payload has no notificationId', async () => {
const { result } = setupConnected();

await waitFor(() => {
expect(result.current.unreadCount).toBe(3);
      });

emitEvent('notification:sent', { eventType: 'notification.sent' });

await new Promise((resolve) => setTimeout(resolve, 50));
expect(result.current.unreadCount).toBe(3);
    });

it('counts different notification ids independently', async () => {
const { result } = setupConnected();

await waitFor(() => {
expect(result.current.unreadCount).toBe(3);
      });

emitEvent('notification:sent', {
eventType: 'notification.sent',
notificationId: 'id-a',
type: 'comment_reply',
timestamp: new Date().toISOString(),
      });
emitEvent('notification:sent', {
eventType: 'notification.sent',
notificationId: 'id-b',
type: 'comment_reply',
timestamp: new Date().toISOString(),
      });
emitEvent('notification:sent', {
eventType: 'notification.sent',
notificationId: 'id-c',
type: 'comment_reply',
timestamp: new Date().toISOString(),
      });

await waitFor(() => {
expect(result.current.unreadCount).toBe(6);
      });
    });
  });
});
