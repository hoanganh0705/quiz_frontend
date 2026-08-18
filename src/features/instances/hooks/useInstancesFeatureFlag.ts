"use client";

import { getFeatureFlagValue } from "@/lib/feature-flags";

export interface UseInstancesFeatureFlagResult {

isPlaceholder: boolean;

isLive: boolean;

flagValue: "live" | "placeholder";
}

export function useInstancesFeatureFlag(): UseInstancesFeatureFlagResult {
const flagValue = getFeatureFlagValue("multiplayer_instances_live");
const isPlaceholder = flagValue === "placeholder";
const isLive = flagValue === "live";

return {
isPlaceholder,
isLive,
flagValue,
  };
}