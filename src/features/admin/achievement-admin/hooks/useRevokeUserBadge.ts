"use client";

import { useCallback, useRef, useState } from "react";

import { mutate as globalMutate } from "swr";

import { ApiError } from "@/lib/api/core/ApiError";
import { addAchievementAdminBreadcrumb } from "@/lib/admin/admin_live_sentry";

import {
revokeUserBadge,
type AchievementBadgeRevokeResponseDto,
} from "@/features/admin/services/achievement-admin.service";
import type { UserBadgeDto } from "../achievement-admin-types";

import {
isSelfRevokeAttempt,
validateBadgeId,
validateUserId,
} from "../validation";

import { invalidateAchievementAdmin } from "../cache-keys";

import { broadcastAchievementAdminMutation } from "../broadcast";

export interface UseRevokeUserBadgeAudit {

readonly before: UserBadgeDto | null;

readonly after: AchievementBadgeRevokeResponseDto | null;
}

export interface UseRevokeUserBadgeResult {

readonly revoke: (
userId: string,
badgeId: string,
options?: { before?: unknown },
  ) => Promise<AchievementBadgeRevokeResponseDto>;

readonly isPending: boolean;

readonly error: ApiError | null;

readonly audit: UseRevokeUserBadgeAudit;

readonly reset: () => void;
}

function makeSyntheticError(code: string, message: string): ApiError {
return ApiError.fromInput({
status: 400,
code,
message,
    // No requestId — these are client-side rejections.
  });
}

export function useRevokeUserBadge(): UseRevokeUserBadgeResult {
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const [audit, setAudit] = useState<UseRevokeUserBadgeAudit>({
before: null,
after: null,
  });

const inFlightRef = useRef<Promise<AchievementBadgeRevokeResponseDto> | null>(
null,
  );

const invalidate = useCallback((userId: string) => {
void invalidateAchievementAdmin(userId, globalMutate);
  }, []);

const revoke = useCallback(
(
userId: string,
badgeId: string,
options?: { before?: unknown },
    ): Promise<AchievementBadgeRevokeResponseDto> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

const currentUserId: string | null = null;
if (isSelfRevokeAttempt(currentUserId, userId)) {
const err = makeSyntheticError(
"SELF_ACTION_FORBIDDEN",
"Cannot revoke your own badge.",
        );
setError(err);
return Promise.reject(err);
      }

if (validateUserId(userId).ok === false) {
const err = makeSyntheticError(
"invalid-uuid",
"Invalid userId format.",
        );
setError(err);
return Promise.reject(err);
      }
if (validateBadgeId(badgeId).ok === false) {
const err = makeSyntheticError(
"invalid-uuid",
"Invalid badgeId format.",
        );
setError(err);
return Promise.reject(err);
      }

const startedAt = Date.now();
setIsPending(true);
setError(null);

const beforeSnapshot = options?.before ?? null;

addAchievementAdminBreadcrumb({
route: 'achievements.revokeUserBadge',
action: "achievement.revokeBadge",
targetId: userId,
status: "started",
durationMs: 0,
      });

const promise = revokeUserBadge(userId, badgeId)
        .then((result) => {
const durationMs = Date.now() - startedAt;
const revokeResult =
result as unknown as AchievementBadgeRevokeResponseDto;

setAudit((prev) => ({ ...prev, after: revokeResult }));
setIsPending(false);

addAchievementAdminBreadcrumb({
route: 'achievements.revokeUserBadge',
action: "achievement.revokeBadge",
targetId: userId,
status: "success",
durationMs,
          });

invalidate(userId);

broadcastAchievementAdminMutation({
action: "revoke",
userId,
badgeId: revokeResult.badgeId,
requestId: "", // revoke has no server requestId
          });

return revokeResult;
        })
        .catch((err: unknown) => {
const durationMs = Date.now() - startedAt;
const apiError = err as ApiError;

setError(apiError);
setIsPending(false);

addAchievementAdminBreadcrumb({
route: 'achievements.revokeUserBadge',
action: "achievement.revokeBadge",
targetId: userId,
status: "failure",
durationMs,
code: apiError.code,
requestId: apiError.requestId as string | undefined,
correlationId: apiError.correlationId as
| string
              | undefined,
          });

return Promise.reject(apiError);
        })
        .finally(() => {
inFlightRef.current = null;
        });

inFlightRef.current = promise;
return promise;
    },
[invalidate],
  );

const reset = useCallback(() => {
setIsPending(false);
setError(null);
setAudit({ before: null, after: null });
inFlightRef.current = null;
  }, []);

return {
revoke,
isPending,
error,
audit,
reset,
  };
}
