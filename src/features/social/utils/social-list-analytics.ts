"use client";

import type { SocialListRowVariant } from "../components/SocialListRow";

export interface SocialListRowTappedEvent {

userId: string;

variant: SocialListRowVariant;
}

export function trackSocialListRowTapped(event: SocialListRowTappedEvent): void {

if (typeof window === "undefined") {
return;
  }

const g = window as unknown as {
analytics?: {
track?: (name: string, payload: Record<string, unknown>) => void;
    };
  };
if (g.analytics?.track !== undefined) {
g.analytics.track("social_list_row_tapped", { ...event });
  }
}