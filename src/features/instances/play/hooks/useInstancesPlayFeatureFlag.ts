"use client";

import { getFeatureFlagValue } from "@/lib/feature-flags";

export interface UseInstancesPlayFeatureFlagResult {

isPlaceholder: boolean;

isLive: boolean;

flagValue: "live" | "placeholder";
}

export function useInstancesPlayFeatureFlag(): UseInstancesPlayFeatureFlagResult {
const flagValue = getFeatureFlagValue("multiplayer_play_live");
const isPlaceholder = flagValue === "placeholder";
const isLive = flagValue === "live";

return {
isPlaceholder,
isLive,
flagValue,
  };
}
