

import {
getFeatureFlagValue,
type FeatureFlagValueMap,
} from "@/lib/feature-flags";

export const PHASE5_RANKINGS_FLAG = "rankings_live" as const satisfies keyof FeatureFlagValueMap;

export function isRankingSurfaceEnabled(): boolean {
return getFeatureFlagValue(PHASE5_RANKINGS_FLAG) === "live";
}
