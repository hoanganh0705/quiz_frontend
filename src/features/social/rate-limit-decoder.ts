

import type { ApiError } from "@/lib/api";

export interface DecodedRateLimit {

readonly cooldownSeconds: number | null;
}

export function decodeRateLimit(error: ApiError | null): DecodedRateLimit {
if (error === null) {
return { cooldownSeconds: null };
  }

const raw = error as unknown as {
data?: {
extensions?: {
retryAfterMs?: unknown;
retryAfterSeconds?: unknown;
      };
    };
  };
const extensions = raw.data?.extensions;
if (extensions === undefined) {
return { cooldownSeconds: null };
  }

if (typeof extensions.retryAfterMs === "number" && extensions.retryAfterMs > 0) {
return { cooldownSeconds: Math.ceil(extensions.retryAfterMs / 1000) };
  }

if (
typeof extensions.retryAfterSeconds === "number" &&
extensions.retryAfterSeconds > 0
  ) {
return { cooldownSeconds: Math.ceil(extensions.retryAfterSeconds) };
  }
return { cooldownSeconds: null };
}

export const RATE_LIMIT_ERROR_CODES = Object.freeze([
"ACTIVITY_RATE_LIMITED",
"GLOBAL_RATE_LIMITED",
]) as readonly string[];

export function isRateLimitErrorCode(
code: string | undefined,
): code is "ACTIVITY_RATE_LIMITED" | "GLOBAL_RATE_LIMITED" {
if (!code) return false;
return (RATE_LIMIT_ERROR_CODES as readonly string[]).includes(code);
}
