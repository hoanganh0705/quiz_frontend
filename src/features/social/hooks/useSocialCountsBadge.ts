"use client";

import { useCallback, useEffect, useMemo } from "react";

import type { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import {
closeSocialListLoadedChannel,
getSocialListLoadedChannel,
} from "@/features/social/social-list-loaded-channel";
import {
subscribeSocialRelationshipInvalidation,
} from "@/lib/social/relationship-broadcast-channel";

import { useSocialCounts } from "./useSocialCounts";
import type { SocialCountsDto } from "../types";

export interface UseSocialCountsBadgeResult {
counts: SocialCountsDto | null;
isLoading: boolean;
isStale: boolean;
error: ApiError | null;
refresh: () => void;
}

export function useSocialCountsBadge(
targetUserId: string | null,
): UseSocialCountsBadgeResult {
const flagValue = getFeatureFlagValue("social_relationship_live");
const isFlagPlaceholder = flagValue === "placeholder";

const base = useSocialCounts(isFlagPlaceholder ? null : targetUserId);

const refresh = useCallback((): void => {
void base.retry();
  }, [base]);

useEffect(() => {
if (typeof window === "undefined") return;
if (targetUserId === null) return;
const unsubscribe = subscribeSocialRelationshipInvalidation(() => {
refresh();
    });
return unsubscribe;
  }, [targetUserId, refresh]);

useEffect(() => {
if (typeof window === "undefined") return;
if (targetUserId === null) return;
const channel = getSocialListLoadedChannel();
if (channel === null) {
return () => {
closeSocialListLoadedChannel();
      };
    }
const handler = (event: MessageEvent): void => {

const data = event.data as
| {
kind?: string;
userId?: string;
targetUserId?: string;
          }
        | null;
if (data === null) return;
if (data.kind !== "list.loaded") return;

const eventUserId = data.targetUserId ?? data.userId;
if (eventUserId !== undefined && eventUserId !== targetUserId) return;
refresh();
    };
channel.addEventListener("message", handler);
return () => {
channel.removeEventListener("message", handler);
closeSocialListLoadedChannel();
    };
  }, [targetUserId, refresh]);

const placeholderResult = useMemo<UseSocialCountsBadgeResult>(
() => ({
counts: null,
isLoading: false,
isStale: false,
error: null,
refresh,
    }),
[refresh],
  );

if (isFlagPlaceholder) return placeholderResult;
if (targetUserId === null) return placeholderResult;

return {
counts: base.counts,
isLoading: base.isLoading,
isStale: base.isStale,
error: base.error,
refresh,
  };
}