

import { createBroadcastChannel } from '@/lib/broadcast';

export const TOURNAMENT_ADMIN_CHANNEL_NAME = 'phase7-admin-tournament' as const;

export type TournamentAdminEventType = 'admin:7.1.tournament-admin.invalidate';

export type TournamentAdminMutation = 'create' | 'update' | 'delete';

const TOURNAMENT_ADMIN_VALID_MUTATIONS = new Set<TournamentAdminMutation>([
'create',
'update',
'delete',
]);

export interface BaseTournamentAdminEvent {
type: TournamentAdminEventType;

tabId: string;

timestamp: number;

mutation: TournamentAdminMutation;

tournamentId: string;
}

export interface TournamentAdminInvalidatedEvent extends BaseTournamentAdminEvent {
type: 'admin:7.1.tournament-admin.invalidate';
}

export type TournamentAdminEvent = TournamentAdminInvalidatedEvent;

const tournamentAdminChannel = createBroadcastChannel<TournamentAdminEvent>(
TOURNAMENT_ADMIN_CHANNEL_NAME,
{
validate: (data): TournamentAdminEvent | null => {
if (typeof data !== 'object' || data === null) return null;
const d = data as Partial<TournamentAdminInvalidatedEvent>;
if (d.type !== 'admin:7.1.tournament-admin.invalidate') return null;
if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
if (typeof d.timestamp !== 'number') return null;
if (
typeof d.mutation !== 'string' ||
!TOURNAMENT_ADMIN_VALID_MUTATIONS.has(d.mutation as TournamentAdminMutation)
      ) {
return null;
      }
if (typeof d.tournamentId !== 'string' || d.tournamentId.length === 0) {
return null;
      }
return d as TournamentAdminEvent;
    },
  },
);

export function closeTournamentAdminChannel(): void {
tournamentAdminChannel.closeChannel();
}

export function resetTournamentAdminBroadcastChannelAvailability(): void {
  // The factory's availability cache is shared across all
  // channels. Resetting it once is the right granularity.
  // (No factory-scoped reset exists yet; the next test that
  // needs it can call `__resetBroadcastAvailabilityForTest` from
  // `@/lib/broadcast`.)
}

export function __resetTournamentAdminChannelForTest(): void {
tournamentAdminChannel.closeChannel();
}

export function subscribeTournamentAdminInvalidate(
handler: (event: TournamentAdminEvent) => void,
): () => void {
return tournamentAdminChannel.subscribe(handler);
}

export function broadcastTournamentAdminInvalidate(
mutation: TournamentAdminMutation,
tournamentId: string,
): void {
if (!tournamentId || typeof tournamentId !== 'string') {

return;
  }
if (!TOURNAMENT_ADMIN_VALID_MUTATIONS.has(mutation)) return;
tournamentAdminChannel.publish({
type: 'admin:7.1.tournament-admin.invalidate',
mutation,
tournamentId,
  });
}
