// Instances feature - public API surface
//
// Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
// Source story:  5.7 — Instance lobby, authenticated room, and host
//                lifecycle controls.
//
// Re-exports the public surface of the instances feature so consumers
// can import from a stable path:
//
//   import { useInstancesFeatureFlag } from '@/features/instances'
//
// Mirrors the `@/features/notifications` and `@/features/tournaments`
// barrel conventions from Phase 5.2 / 5.4.

export * from './services'
export * from './types'
export * from './hooks'

// Component surface — page composition re-exports the lobby + banner
// primitives through the public barrel.
export {
  InstanceLobbySkeleton,
  InstanceRosterRowSkeleton,
  InstanceEmptyState,
  InstanceErrorState,
  InstanceStaleState,
  InstanceConnectionStatus,
  InstanceClosedState,
  PlayerRoster,
  InstanceStatusBanner,
  JoinLeaveCta,
  HostControls,
  InstanceLobby,
  ConnectionBanner,
  InstancePlaceholder,
  type InstanceConnectionStatusProps,
  type InstanceClosedVariant,
  type PlayerRosterProps,
  type InstanceStatusBannerProps,
  type JoinLeaveCtaProps,
  type HostControlsProps,
  type InstanceLobbyProps,
  type ConnectionBannerProps,
  type InstancePlaceholderProps,
} from './components'

// Page composition
export {
  InstanceRoomPage,
  type InstanceRoomPageProps,
} from './pages'