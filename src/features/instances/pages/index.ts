/**
 * `instances/pages` — public page composition for the instances
 * feature.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 *
 * Mirrors the `@/features/notifications/components/NotificationCenterPage`
 * and `@/features/tournaments/components/TournamentDetailPage`
 * conventions — page composition lives in the feature directory and
 * is re-exported by the public barrel.
 */

export { InstanceRoomPage } from "./InstanceRoomPage";
export type { InstanceRoomPageProps } from "./InstanceRoomPage";