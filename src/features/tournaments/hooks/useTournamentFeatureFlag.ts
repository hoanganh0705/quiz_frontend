"use client";

import { getFeatureFlagValue } from "@/lib/feature-flags";

export interface UseTournamentFeatureFlagResult {

isPlaceholder: boolean;

flagValue: "live" | "placeholder";
}

export function useTournamentFeatureFlag(): UseTournamentFeatureFlagResult {
const flagValue = getFeatureFlagValue("tournaments_live");
const isPlaceholder = flagValue === "placeholder";

return {
isPlaceholder,
flagValue,
  };
}
