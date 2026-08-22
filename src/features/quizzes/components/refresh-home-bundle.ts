import { getHome } from "@/lib/api";
import type { HomeControllerGetBundle200 } from "@/lib/api/generated/schemas";

export type HomeBundleData = NonNullable<HomeControllerGetBundle200["data"]>;

/**
 * Result of a featured-rail refresh, passed to the optional callback so
 * downstream callers can seed additional state (e.g. SSE events, analytics).
 */
export type FeaturedRefreshHandle = (data: HomeBundleData | null) => void;

/**
 * Re-fetch the home bundle. Used by the Featured rail's explicit Refresh
 * action; the result is fed into the SWR cache so any rail that reads
 * `["home", "bundle"]` resyncs.
 */
export async function refreshHomeBundle(): Promise<HomeBundleData | null> {
  const envelope = await getHome().homeControllerGetBundle();
  return (envelope?.data as HomeBundleData | undefined) ?? null;
}