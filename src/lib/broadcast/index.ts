/**
 * `lib/broadcast/index.ts` — public surface for the cross-tab
 * broadcast-channel infrastructure.
 *
 * Source epic: Phase 4 — Cross-tab sync infrastructure.
 * Source ticket: TKT-Phase-4.A2.
 *
 * The factory in `./create-channel` is the single canonical entry
 * point for every cross-tab module in the codebase. Channel-specific
 * modules (auth, profile, bookmarks, attempts, social-relationship,
 * social-list-loaded, tournament-admin, comment-moderation,
 * review-moderation) re-export their `subscribeXxx` / `publishXxx`
 * helpers from their own files; this barrel re-exports the factory
 * and the common types so feature code can build new channels
 * without reaching into the implementation details.
 *
 * @see src/lib/api/core/broadcast-channel.ts
 * @see docs/frontend-cleanup-audit.md Phase 4
 */

export {
  createBroadcastChannel,
  __resetBroadcastAvailabilityForTest,
} from './create-channel';
export type {
  BroadcastChannelApi,
  ChannelSubscriber,
  ChannelValidator,
} from './create-channel';
