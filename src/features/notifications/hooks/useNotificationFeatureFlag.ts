"use client";

import { getFeatureFlagValue } from "@/lib/feature-flags";

export interface UseNotificationFeatureFlagResult {

isPlaceholder: boolean;

flagValue: "live" | "placeholder";
}

export function useNotificationFeatureFlag(): UseNotificationFeatureFlagResult {
const flagValue = getFeatureFlagValue("notifications_live");
const isPlaceholder = flagValue === "placeholder";

return {
isPlaceholder,
flagValue,
  };
}