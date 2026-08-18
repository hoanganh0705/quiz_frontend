"use client";

import { useCallback, useMemo } from "react";

import { ApiError, coerceToApiError, useSingleWithRetry } from "@/lib/api";
import type { ErrorCode } from "@/lib/api/error-codes";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { stripRelationshipInternalIds } from "@/features/social/dto-adapters";
import { getRelationshipStatus } from "@/features/social/services";
import {
SOCIAL_CACHE_KEYS,
asErrorCode,
isSocialErrorCode,
type Relationship,
type SocialErrorCode,
} from "@/features/social/types";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export type UseRelationshipErrorCode = SocialErrorCode | ErrorCode;

export interface UseRelationshipResult {
relationship: Relationship;
isLoading: boolean;
isStale: boolean;
error: ApiError | null;
retry: () => Promise<void>;

isAuthenticated: boolean;
}

const NO_REQUEST_RESULT: UseRelationshipResult = Object.freeze({
relationship: "none",
isLoading: false,
isStale: false,
error: null,
retry: () => Promise.resolve(),
isAuthenticated: false,
});

const SELF_RESULT: UseRelationshipResult = Object.freeze({
relationship: "self",
isLoading: false,
isStale: false,
error: null,
retry: () => Promise.resolve(),
isAuthenticated: true,
});

function resolveShortCircuit(args: {
isFlagPlaceholder: boolean;
isAuthenticated: boolean;
targetUserId: string | null;
isSelf: boolean;
}): UseRelationshipResult | null {
if (args.isFlagPlaceholder) return NO_REQUEST_RESULT;
if (!args.isAuthenticated) return NO_REQUEST_RESULT;
if (args.targetUserId === null) return NO_REQUEST_RESULT;
if (args.isSelf) return SELF_RESULT;
return null;
}

export interface UseRelationshipOptions {

currentUserId?: string | null;
}

export function useRelationship(
targetUserId: string | null,
options: UseRelationshipOptions = {},
): UseRelationshipResult {
const flagValue = getFeatureFlagValue("social_relationship_live");
const isFlagPlaceholder = flagValue === "placeholder";

const auth = useAuthSession();
const overrideUserId = options.currentUserId ?? null;
const viewerUserId = overrideUserId ?? auth.currentUser?.userId ?? null;
const isAuthenticated = auth.isAuthenticated && viewerUserId !== null;

const isSelf = useMemo<boolean>(() => {
if (targetUserId === null) return false;
if (viewerUserId === null) return false;
return targetUserId === viewerUserId;
  }, [targetUserId, viewerUserId]);

const key = useMemo<readonly unknown[] | null>(() => {
if (isFlagPlaceholder) return null;
if (!isAuthenticated) return null;
if (targetUserId === null) return null;
if (isSelf) return null;
return SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId);
  }, [isFlagPlaceholder, isAuthenticated, targetUserId, isSelf]);

const fetcher = useCallback(
async (): Promise<Relationship> => {

if (isFlagPlaceholder) return "none";
if (!isAuthenticated) return "none";
if (targetUserId === null) return "none";
if (isSelf) return "self";

try {
const envelope = await getRelationshipStatus(targetUserId);

const projection = stripRelationshipInternalIds(envelope?.data);
return projection.relationship;
      } catch (err) {
const apiErr = coerceToApiError(err);

if (
apiErr.code === "GLOBAL_NOT_FOUND" ||
apiErr.code === "USER_NOT_FOUND" ||
apiErr.status === 404
        ) {
return "none";
        }
throw apiErr;
      }
    },
[isFlagPlaceholder, isAuthenticated, targetUserId, isSelf],
  );

const result = useSingleWithRetry<Relationship>({
key,
fetcher,
  });

const retry = useCallback(async () => {
await result.retry();

void result;
  }, [result]);

const mappedError = useMemo<ApiError | null>(() => {
if (result.error === null) return null;
const raw = result.error.code;
const mapped: ErrorCode = isSocialErrorCode(raw)
? asErrorCode(raw)
: (raw as ErrorCode | undefined) ?? "GLOBAL_INTERNAL_ERROR";
return ApiError.fromInput({
status: result.error.status,
code: mapped,
message: result.error.detail,
title: result.error.title,
requestId: result.error.requestId,
    });
  }, [result.error]);

const shortCircuit = resolveShortCircuit({
isFlagPlaceholder,
isAuthenticated,
targetUserId,
isSelf,
  });
if (shortCircuit !== null) return shortCircuit;

return {
relationship: result.data ?? "none",
isLoading: result.isLoading,
isStale: false,
error: mappedError,
retry,
isAuthenticated: true,
  };
}

export const __testing = {
resolveShortCircuit,
NO_REQUEST_RESULT,
SELF_RESULT,
};