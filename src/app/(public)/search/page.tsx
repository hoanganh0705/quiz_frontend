/**
 * `/search` — Story 5.6 unified search route entry.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.F1 (route shell).
 *
 * Thin route entry that delegates to the `<SearchPage />` client
 * component. The route lives under `(public)` — the search surface
 * itself gates on auth (anonymous users see public results only).
 */

import { SearchPage } from "@/features/search/components/SearchPage";

export default function SearchRoute(): React.ReactElement {
  return <SearchPage />;
}
