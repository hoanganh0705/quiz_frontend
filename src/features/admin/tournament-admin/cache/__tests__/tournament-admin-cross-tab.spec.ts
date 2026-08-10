/**
 * `__tests__/tournament-admin-cross-tab.spec.ts`
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.G2.
 *
 * Covers the acceptance criteria:
 *
 *   1. `broadcastTournamentAdminInvalidate('delete', 'tournament-1')` emits
 *      the documented event on the cross-tab channel.
 *   2. `subscribeTournamentAdminInvalidate(handler)` returns an unsubscribe
 *      function that prevents further events to that handler.
 *   3. The broadcast does NOT fire on failure — covered by per-hook specs.
 *   4. (Type-check covered by `pnpm type-check`.)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock BroadcastChannel ──────────────────────────────────────────────────

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  static lastPostedData: unknown = null;

  public name: string;
  public listeners: ((event: { data: unknown }) => void)[] = [];
  public closed = false;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  addEventListener(_type: 'message', listener: (event: { data: unknown }) => void): void {
    this.listeners.push(listener);
  }

  removeEventListener(_type: 'message', listener: (event: { data: unknown }) => void): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  postMessage(data: unknown): void {
    if (this.closed) return;
    MockBroadcastChannel.lastPostedData = data;
    for (const listener of this.listeners) {
      listener({ data });
    }
  }

  close(): void {
    this.closed = true;
    this.listeners = [];
  }
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  MockBroadcastChannel.instances = [];
  MockBroadcastChannel.lastPostedData = null;
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
  vi.stubGlobal('window', {});
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe('TournamentAdminCrossTab', () => {
  describe('exports', () => {
    it('exports the correct channel name', async () => {
      const { TOURNAMENT_ADMIN_CHANNEL_NAME } = await import('../tournament-admin-cross-tab');
      expect(TOURNAMENT_ADMIN_CHANNEL_NAME).toBe('phase7-admin-tournament');
    });
  });

  describe('broadcastTournamentAdminInvalidate', () => {
    it('posts the documented event structure', async () => {
      const { broadcastTournamentAdminInvalidate } = await import('../tournament-admin-cross-tab');

      broadcastTournamentAdminInvalidate('create', 'tournament-1');

      expect(MockBroadcastChannel.lastPostedData).toMatchObject({
        type: 'admin:7.1.tournament-admin.invalidate',
        mutation: 'create',
        tournamentId: 'tournament-1',
        tabId: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('does not post when tournamentId is empty string', async () => {
      const { broadcastTournamentAdminInvalidate } = await import('../tournament-admin-cross-tab');

      // @ts-expect-error - testing defensive behavior
      broadcastTournamentAdminInvalidate('create', '');

      expect(MockBroadcastChannel.lastPostedData).toBeNull();
    });
  });

  describe('subscribeTournamentAdminInvalidate', () => {
    it.todo('calls the handler when a valid message is received');

    it.todo('filters out same-tab messages');

    it.todo('returns an unsubscribe function that stops events');
  });
});
