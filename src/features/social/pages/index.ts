/**
 * Social feature pages barrel.
 *
 * Re-exports the social pages from Epic 6.1 / 6.2 / 6.3 / 6.5 and
 * Epic 6.8. Consumers (e.g. the route gate) import through this
 * barrel so the internal file layout can evolve without touching
 * every consumer.
 *
 * Epic 6.8 additions:
 *   - `IncomingRequestsListPage`  (TKT-6.8.E5)
 *   - `OutgoingRequestsListPage`  (TKT-6.8.E6)
 *
 * Epic 6.9 additions:
 *   - `SocialFeedPage`            (TKT-6.9.G1)
 */

export { IncomingRequestsListPage } from "./IncomingRequestsListPage";
export type {
  IncomingRequestsListPageProps,
} from "./IncomingRequestsListPage";

export { OutgoingRequestsListPage } from "./OutgoingRequestsListPage";
export type {
  OutgoingRequestsListPageProps,
} from "./OutgoingRequestsListPage";

export { SocialFeedPage } from "./SocialFeedPage";
