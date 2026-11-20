import {
  getFeatureFlagValue,
  type FeatureFlagValueMap,
} from "@/lib/feature-flags";

export const RANKINGS_FLAG =
  "rankings_live" as const satisfies keyof FeatureFlagValueMap;

export function isRankingSurfaceEnabled(): boolean {
  return getFeatureFlagValue(RANKINGS_FLAG) === "live";
}
