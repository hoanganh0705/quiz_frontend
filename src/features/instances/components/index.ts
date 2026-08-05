/**
 * `instances/components` — public component surface for the instance
 * lobby feature.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 *
 * Components are added incrementally by tickets TKT-5.7.D1 through
 * TKT-5.7.D5. The shared primitives are exported under `./shared`.
 */

export * from "./shared";

export { PlayerRoster } from "./PlayerRoster";
export type { PlayerRosterProps } from "./PlayerRoster";

export { InstanceStatusBanner } from "./InstanceStatusBanner";
export type { InstanceStatusBannerProps } from "./InstanceStatusBanner";

export { JoinLeaveCta } from "./JoinLeaveCta";
export type { JoinLeaveCtaProps } from "./JoinLeaveCta";

export { HostControls } from "./HostControls";
export type { HostControlsProps } from "./HostControls";

export { InstanceLobby } from "./InstanceLobby";
export type { InstanceLobbyProps } from "./InstanceLobby";

export { ConnectionBanner } from "./ConnectionBanner";
export type { ConnectionBannerProps } from "./ConnectionBanner";

export { InstancePlaceholder } from "./InstancePlaceholder";
export type { InstancePlaceholderProps } from "./InstancePlaceholder";