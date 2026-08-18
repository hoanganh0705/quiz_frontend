

import {
getFeatureFlagValue,
type FeatureFlagValueMap,
} from "@/lib/feature-flags";

export const PHASE5_SEARCH_FLAG = "search_live" as const satisfies keyof FeatureFlagValueMap;

export function isSearchSurfaceEnabled(): boolean {
return getFeatureFlagValue(PHASE5_SEARCH_FLAG) === "live";
}
