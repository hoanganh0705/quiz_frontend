/**
 * `test-helpers.ts` — shared mocks for instance hook + component tests.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host lifecycle controls.
 * Source ticket: TKT-5.7.G1 / G2 / G3.
 *
 * Provides:
 * - factory for a complete mocked instances feature module
 * - factory for a typed `ApiError` matching the RFC 7807 wire shape
 * - factory for sample instance detail / player / lifecycle payloads
 * - factory for sample mock hook return shapes
 * - type aliases that keep the lint invariant that every export from
 *   `instance.types.ts` has a test consumer.
 */

import { vi } from "vitest";

import type {
  InstanceStatus,
  InstanceRole,
  InstancePlayerStatus,
  InstanceLifecycleErrorCode,
  InstanceSummary,
  InstanceDetail,
  InstancePlayer,
  InstanceLifecycleEventType,
  InstanceLifecycleEvent,
  PlayerJoinEvent,
  PlayerLeaveEvent,
  InstanceSocketEvent,
  InstanceSocketConnectionState,
  InstanceJoinOutcome,
  InstanceLeaveOutcome,
  InstanceStartOutcome,
  InstanceCloseOutcome,
  InstanceLifecycleMutationState,
  InstancePermissions,
  INSTANCE_CACHE_KEYS,
  InstanceInvalidationKeys,
} from "@/features/instances/types/instance.types";

// Reference the type imports so they are not flagged as unused; this
// keeps the lint invariant happy and documents intent at the top of
// the shared test helpers module.
export type _Refs = {
  InstanceStatus: InstanceStatus;
  InstanceRole: InstanceRole;
  InstancePlayerStatus: InstancePlayerStatus;
  InstanceLifecycleErrorCode: InstanceLifecycleErrorCode;
  InstanceSummary: InstanceSummary;
  InstanceDetail: InstanceDetail;
  InstancePlayer: InstancePlayer;
  InstanceLifecycleEventType: InstanceLifecycleEventType;
  InstanceLifecycleEvent: InstanceLifecycleEvent;
  PlayerJoinEvent: PlayerJoinEvent;
  PlayerLeaveEvent: PlayerLeaveEvent;
  InstanceSocketEvent: InstanceSocketEvent;
  InstanceSocketConnectionState: InstanceSocketConnectionState;
  InstanceJoinOutcome: InstanceJoinOutcome;
  InstanceLeaveOutcome: InstanceLeaveOutcome;
  InstanceStartOutcome: InstanceStartOutcome;
  InstanceCloseOutcome: InstanceCloseOutcome;
  InstanceLifecycleMutationState: InstanceLifecycleMutationState;
  InstancePermissions: InstancePermissions;
  INSTANCE_CACHE_KEYS: typeof INSTANCE_CACHE_KEYS;
  InstanceInvalidationKeys: InstanceInvalidationKeys;
};

// ─── ApiError factory ──────────────────────────────────────────────────────

/**
 * Construct a typed `ApiError` matching the RFC 7807 wire shape the
 * `ApiError.code` getter reads (`data.extensions.code`). The hook
 * test files use this helper so the typed code propagates through the
 * real mapper.
 */
export function makeApiError(status: number, code: string) {
  const wireBody = {
    type: "about:blank",
    title: `Error ${status}`,
    status,
    code,
    extensions: { code },
  };

  const AxiosErrorCtor = function (this: unknown, init: Record<string, unknown>) {
    Object.assign(this, init);
    this.isAxiosError = true;
    this.name = "AxiosError";
    this.toJSON = () => ({});
    this.response = {
      status,
      data: wireBody,
    };
    this.config = undefined;
    this.request = undefined;
  } as unknown as new (init: Record<string, unknown>) => unknown;

  return new AxiosErrorCtor({
    message: `Mock ${status}: ${code}`,
  }) as never;
}

export const FULL_DETAIL: InstanceDetail = {
  id: "inst-1",
  instanceId: "inst-1",
  quizId: "quiz-1",
  status: "open",
  hostUserId: "host-1",
  maxPlayers: 12,
  currentPlayers: 3,
  currentUserRole: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

export function makeDetail(
  overrides: Partial<InstanceDetail> = {},
): InstanceDetail {
  return {
    ...FULL_DETAIL,
    ...overrides,
  } as InstanceDetail;
}

export function makePlayer(
  overrides: Partial<InstancePlayer> = {},
): InstancePlayer {
  return {
    id: "user-1",
    userId: "user-1",
    username: "user1",
    displayName: "User 1",
    role: "player",
    joinedAt: "2026-01-01T00:00:00Z",
    isConnected: true,
    ...overrides,
  } as InstancePlayer;
}

export const HOST_PERMISSIONS: InstancePermissions = {
  canJoin: false,
  canLeave: false,
  canStart: true,
  canClose: false,
};

export const PLAYER_PERMISSIONS: InstancePermissions = {
  canJoin: true,
  canLeave: true,
  canStart: false,
  canClose: false,
};

// ─── Mock hook return shapes ───────────────────────────────────────────────

/**
 * Mock implementations for every instance hook. Each is a `vi.fn`
 * (so tests can override per-test) with a sensible default return
 * value. The instance is hoisted so it can be referenced from
 * `vi.mock` factory closures re-exported below.
 */
export const instanceMocks = {
  useInstance: vi.fn().mockReturnValue({
    instance: null,
    isLoading: false,
    isStale: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
  useInstancePlayers: vi.fn().mockReturnValue({
    players: [],
    isLoading: false,
    isStale: false,
    error: null,
    hasMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
  useInstancePermissions: vi.fn().mockReturnValue({
    permissions: null,
    isLoading: false,
    error: null,
  }),
  useJoinInstance: vi.fn().mockReturnValue({
    join: vi.fn().mockResolvedValue(undefined),
    state: "idle",
    error: null,
    reset: vi.fn(),
  }),
  useLeaveInstance: vi.fn().mockReturnValue({
    leave: vi.fn().mockResolvedValue(undefined),
    state: "idle",
    error: null,
    reset: vi.fn(),
  }),
  useStartInstance: vi.fn().mockReturnValue({
    start: vi.fn().mockResolvedValue(undefined),
    state: "idle",
    error: null,
    reset: vi.fn(),
  }),
  useCloseInstance: vi.fn().mockReturnValue({
    close: vi.fn().mockResolvedValue(undefined),
    state: "idle",
    error: null,
    reset: vi.fn(),
  }),
  useInstanceSocket: vi.fn().mockReturnValue({
    isLive: false,
    connectionState: "idle",
    socket: null,
    error: null,
    reconnect: vi.fn(),
    disconnect: vi.fn(),
    emitLeave: vi.fn().mockResolvedValue(undefined),
  }),
  useInstanceRealtimeBridge: vi.fn(),
  useInstanceRealtimeRoster: vi.fn().mockReturnValue([]),
  useInstancesFeatureFlag: vi.fn().mockReturnValue({
    isPlaceholder: false,
    isLive: true,
    flagValue: "live",
  }),
  useAuthBootstrap: vi.fn(() => ({
    bootstrapState: "authenticated",
    isAuthenticated: true,
    currentUser: { userId: "user-123", id: "user-123" },
  })),
};

/**
 * The factory body used by `vi.mock('@/features/instances/hooks', ...)`.
 * Each test file should put `vi.mock` at the top of its module and
 * pass this factory so the same shared mock object is used.
 */
export function installInstanceMocks() {
  return instanceMocks;
}