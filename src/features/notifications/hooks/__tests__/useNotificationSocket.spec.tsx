

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';

const mockGetFeatureFlagValue = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseSocket = vi.fn();
const mockUseRealtimeEvent = vi.fn();
const mockEmitPhase5Invalidation = vi.fn();
vi.mock('@/lib/realtime', async () => {
const actual = await vi.importActual<typeof import('@/lib/realtime')>('@/lib/realtime');
return {
...actual,
useSocket: (...args: unknown[]) => mockUseSocket(...args),
useRealtimeEvent: (...args: unknown[]) => mockUseRealtimeEvent(...args),
emitPhase5Invalidation: (...args: unknown[]) =>
mockEmitPhase5Invalidation(...args),
  };
});

class MockBroadcastChannel {
static instances: MockBroadcastChannel[] = [];
name: string;
listeners = new Set<(event: MessageEvent) => void>();
addEventListener = vi.fn((_type: string, handler: (e: MessageEvent) => void) => {
this.listeners.add(handler);
  });
removeEventListener = vi.fn((_type: string, handler: (e: MessageEvent) => void) => {
this.listeners.delete(handler);
  });
close = vi.fn();
postMessage = vi.fn();
constructor(name: string) {
this.name = name;
MockBroadcastChannel.instances.push(this);
  }
}

describe('useNotificationSocket', () => {
beforeEach(() => {
vi.clearAllMocks();
MockBroadcastChannel.instances = [];
mockGetFeatureFlagValue.mockImplementation((key: string) => {
if (key === 'notifications_live') return 'live';
if (key === 'realtime_infrastructure_live') return 'live';
return 'placeholder';
    });
mockUseSocket.mockReturnValue({
socket: null,
connectionState: 'idle',
error: null,
reconnect: vi.fn(),
disconnect: vi.fn(),
    });
mockUseRealtimeEvent.mockImplementation(() => undefined);

(globalThis as unknown as { BroadcastChannel: typeof MockBroadcastChannel }).BroadcastChannel =
MockBroadcastChannel;
  });

afterEach(() => {
vi.restoreAllMocks();
delete (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel;
  });

describe('hook shape', () => {
it('exposes the documented surface', () => {
const { result } = renderHook(() => useNotificationSocket());
expect(result.current).toHaveProperty('isLive');
expect(result.current).toHaveProperty('connectionState');
expect(result.current).toHaveProperty('socket');
expect(result.current).toHaveProperty('error');
expect(result.current).toHaveProperty('reconnect');
expect(result.current).toHaveProperty('disconnect');
    });
  });

describe('feature flag gating', () => {
it('does not enable socket when notifications flag is placeholder', () => {
mockGetFeatureFlagValue.mockImplementation((key: string) => {
if (key === 'notifications_live') return 'placeholder';
if (key === 'realtime_infrastructure_live') return 'live';
return 'placeholder';
      });

renderHook(() => useNotificationSocket());

expect(mockUseSocket).toHaveBeenCalledWith(
'/notifications',
expect.objectContaining({ enabled: false }),
      );
    });

it('does not enable socket when realtime infrastructure flag is placeholder', () => {
mockGetFeatureFlagValue.mockImplementation((key: string) => {
if (key === 'notifications_live') return 'live';
if (key === 'realtime_infrastructure_live') return 'placeholder';
return 'placeholder';
      });

renderHook(() => useNotificationSocket());

expect(mockUseSocket).toHaveBeenCalledWith(
'/notifications',
expect.objectContaining({ enabled: false }),
      );
    });

it('isLive is false when socket is not connected', () => {
mockUseSocket.mockReturnValue({
socket: { id: 'mock' },
connectionState: 'reconnecting',
error: null,
reconnect: vi.fn(),
disconnect: vi.fn(),
      });

const { result } = renderHook(() => useNotificationSocket());
expect(result.current.isLive).toBe(false);
    });

it('isLive is true when socket is connected and flags are live', () => {
mockUseSocket.mockReturnValue({
socket: { id: 'mock' },
connectionState: 'connected',
error: null,
reconnect: vi.fn(),
disconnect: vi.fn(),
      });

const { result } = renderHook(() => useNotificationSocket());
expect(result.current.isLive).toBe(true);
    });
  });

describe('event subscriptions', () => {
it('registers three event subscriptions through useRealtimeEvent', () => {
mockUseSocket.mockReturnValue({
socket: { id: 'mock' },
connectionState: 'connected',
error: null,
reconnect: vi.fn(),
disconnect: vi.fn(),
      });

renderHook(() => useNotificationSocket());

expect(mockUseRealtimeEvent).toHaveBeenCalledTimes(3);
    });

it('still registers three subscriptions even when not connected', () => {
mockUseSocket.mockReturnValue({
socket: null,
connectionState: 'idle',
error: null,
reconnect: vi.fn(),
disconnect: vi.fn(),
      });

renderHook(() => useNotificationSocket());

expect(mockUseRealtimeEvent).toHaveBeenCalledTimes(3);
    });
  });

describe('cross-tab BroadcastChannel integration', () => {
it('registers a BroadcastChannel listener', () => {
renderHook(() => useNotificationSocket());

expect(MockBroadcastChannel.instances.length).toBeGreaterThan(0);
    });

it('listens on the realtime/invalidation channel', () => {
renderHook(() => useNotificationSocket());

const channel = MockBroadcastChannel.instances.at(-1);
expect(channel?.name).toBe('realtime/invalidation');
    });
  });
});
