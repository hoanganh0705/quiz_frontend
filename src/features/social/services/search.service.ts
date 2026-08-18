

import { ApiError, getSocial } from "@/lib/api";

import type {
SocialControllerSearchUsersResult,
} from "@/lib/api/generated/social/social";

import { addSocialServiceBreadcrumb } from "@/lib/social/social-sentry";

import { decodeSearchRateLimit } from "@/features/social/discovery-rate-limit";
import type { SocialListVisibility } from "@/features/social/social-list-visibility";

import type { SearchableUserDto } from "@/lib/api/generated/schemas";

export interface SearchUsersServiceResult {
readonly items: readonly SearchableUserDto[];
readonly total: number;

readonly cooldownSeconds: number | null;
readonly visibility: SocialListVisibility;
}

export interface SearchUsersPagination {
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

function clampTotal(total: unknown): number {
if (typeof total !== "number" || !Number.isFinite(total) || total < 0) {
return 0;
  }
return Math.floor(total);
}

export async function searchUsers(
query: string,
pagination?: SearchUsersPagination,
): Promise<SearchUsersServiceResult> {
const start = Date.now();
addSocialServiceBreadcrumb({
route: "social.searchUsers",
  });

let wire: SocialControllerSearchUsersResult;
try {
wire = await getSocial().socialControllerSearchUsers({
q: query,
limit: pagination?.limit,
    });
  } catch (err) {
const apiErr = err as Partial<ApiError> | null;
addSocialServiceBreadcrumb({
route: "social.searchUsers",
status: (apiErr as { status?: number } | null)?.status,
durationMs: Date.now() - start,
code: apiErr?.code,
    });
throw err;
  }

const envelope = requireEnvelope(wire, "Search users response missing envelope");

const items: SearchableUserDto[] = envelope?.data ?? [];

let cooldownSeconds: number | null = null;
const responseWithHeaders = wire as { headers?: Record<string, string | string[] | undefined> } | null;
if (responseWithHeaders?.headers) {
const { cooldownSeconds: decoded } = decodeSearchRateLimit(
responseWithHeaders.headers,
    );
cooldownSeconds = decoded;
  }

const rawTotal = (envelope?.meta?.pagination as { total?: unknown } | undefined)?.total;
const total = rawTotal !== undefined
? clampTotal(rawTotal)
: items.length;

addSocialServiceBreadcrumb({
route: "social.searchUsers",
status: 200,
durationMs: Date.now() - start,
  });

return {
items,
total,
cooldownSeconds,
visibility: "visible",
  };
}
