

import {
getFeatureFlagValue,
type FeatureFlagValueMap,
} from "@/lib/feature-flags";

export const PHASE5_ACHIEVEMENTS_FLAG = "achievements_live" as const satisfies keyof FeatureFlagValueMap;

export function isAchievementSurfaceEnabled(): boolean {
return getFeatureFlagValue(PHASE5_ACHIEVEMENTS_FLAG) === "live";
}
