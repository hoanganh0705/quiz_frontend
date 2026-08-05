/**
 * `instances/components/shared` — instance lobby shared primitives.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.C1.
 *
 * Pure presentational primitives consumed by `InstanceLobby`,
 * `PlayerRoster`, `HostControls`, `JoinLeaveCta`, and `InstanceRoomPage`.
 * None of them imports `axios`, `fetch`, or any socket client — they
 * branch on typed codes from TKT-5.7.A1 only.
 */

export {
  InstanceLobbySkeleton,
  InstanceRosterRowSkeleton,
} from "./InstanceSkeleton";

export { InstanceEmptyState } from "./InstanceEmptyState";

export { InstanceErrorState } from "./InstanceErrorState";

export { InstanceStaleState } from "./InstanceStaleState";

export { InstanceConnectionStatus } from "./InstanceConnectionStatus";
export type { InstanceConnectionStatusProps } from "./InstanceConnectionStatus";

export { InstanceClosedState } from "./InstanceClosedState";
export type { InstanceClosedVariant } from "./InstanceClosedState";