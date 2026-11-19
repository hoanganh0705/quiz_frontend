import {
  getFeatureFlagValue,
  type FeatureFlagValueMap,
} from "@/lib/feature-flags";

export const ACHIEVEMENTS_FLAG =
  "achievements_live" as const satisfies keyof FeatureFlagValueMap;

export function isAchievementSurfaceEnabled(): boolean {
  return getFeatureFlagValue(ACHIEVEMENTS_FLAG) === "live";
}
