

import { ApiError, getSocial } from "@/lib/api";

import type {
SocialControllerGetUserActivityResult,
} from "@/lib/api/generated/social/social";

import { addSocialActivityBreadcrumb } from "@/lib/social/social-mutuals-sentry";

import { toActivityItem } from "@/features/social/dto-adapters";
import { decodeRateLimit } from "@/features/social/rate-limit-decoder";
import { isActivityRateLimitCode } from "@/features/social/activity-discriminator";
import type { SocialActivityItemDto } from "@/features/social/types";
import type { SocialListVisibility } from "@/features/social/social-list-visibility";

export interface ActivityServiceResult {
readonly items: readonly SocialActivityItemDto[];
readonly total: number;
readonly visibility: SocialListVisibility;

readonly cooldownSeconds?: number;
}

export interface ActivityServicePagination {
readonly cursor?: string;
readonly limit?: number;
}

function requireEnvelope<T>(wire: T | null | undefined, message: string): T {
if (wire === null || wire === undefined) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message,
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return wire;
}

function clampTotal(total: number): number {
if (!Number.isFinite(total) || total < 0) return 0;
return Math.floor(total);
}

function projectActivityPage(envelope: SocialControllerGetUserActivityResult): {
items: SocialActivityItemDto[];
total: number;
} {
const rows = envelope?.data ?? [];
const items: SocialActivityItemDto[] = [];
for (const row of rows) {
const projected = toActivityItem(row);
if (projected !== null) items.push(projected);
  }

const total = clampTotal(items.length);
return { items, total };
}

export async function getUserActivity(
targetUserId: string,
pagination?: ActivityServicePagination,
): Promise<ActivityServiceResult> {
addSocialActivityBreadcrumb({
route: "social.getUserActivity",
targetUserId,
surface: "user-activity",
  });

let wire: SocialControllerGetUserActivityResult;
try {
wire = await getSocial().socialControllerGetUserActivity(
targetUserId,
pagination,
    );
  } catch (err) {

const apiErr = err as Partial<ApiError> | null;
if (apiErr !== null && isActivityRateLimitCode(apiErr.code)) {
const { cooldownSeconds } = decodeRateLimit(
apiErr as unknown as ApiError | null,
      );
addSocialActivityBreadcrumb({
route: "social.getUserActivity",
targetUserId,
surface: "user-activity",
rateLimited: true,
cooldownSeconds: cooldownSeconds ?? undefined,
code: apiErr.code,
      });
    } else if (apiErr !== null) {
addSocialActivityBreadcrumb({
route: "social.getUserActivity",
targetUserId,
surface: "user-activity",
code: apiErr.code,
      });
    }
throw err;
  }

const envelope = requireEnvelope(
wire,
"Get user activity response missing envelope",
  );
const projected = projectActivityPage(envelope);
addSocialActivityBreadcrumb({
route: "social.getUserActivity",
targetUserId,
surface: "user-activity",
total: projected.total,
  });
return {
items: projected.items,
total: projected.total,
visibility: "visible",
  };
}
