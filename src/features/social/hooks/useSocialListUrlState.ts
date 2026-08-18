"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
FORBIDDEN_SOCIAL_STORAGE_KEYS,
SOCIAL_GRAPH_DEFAULT_LIMIT,
SOCIAL_GRAPH_MAX_LIMIT,
SOCIAL_GRAPH_URL_KEYS,
} from "@/features/social/pagination-invariants";

export interface UseSocialListUrlStateResult {

cursor: string | null;

limit: number;

setCursor: (next: string | null) => void;

setLimit: (next: number) => void;

reset: () => void;
}

const CURSOR_KEY = "cursor";
const LIMIT_KEY = "limit";

function readCursorFromParams(params: URLSearchParams): string | null {
const raw = params.get(CURSOR_KEY);
if (raw === null || raw === "") return null;
return raw;
}

function readLimitFromParams(params: URLSearchParams): number {
const raw = params.get(LIMIT_KEY);
if (raw === null || raw === "") return SOCIAL_GRAPH_DEFAULT_LIMIT;
const parsed = Number.parseInt(raw, 10);
if (!Number.isFinite(parsed) || parsed <= 0) {
return SOCIAL_GRAPH_DEFAULT_LIMIT;
  }
if (parsed > SOCIAL_GRAPH_MAX_LIMIT) return SOCIAL_GRAPH_MAX_LIMIT;
return parsed;
}

function assertNoForbiddenKeys(params: URLSearchParams): void {
for (const key of FORBIDDEN_SOCIAL_STORAGE_KEYS) {
if (params.has(key)) {
throw new Error(
`[useSocialListUrlState] forbidden URL key detected: "${key}". ` +
`This indicates a regression that would leak unstable ` +
`internal identifiers into the URL.`,
      );
    }
  }
}

export function useSocialListUrlState(
targetUserId: string | null,
): UseSocialListUrlStateResult {
const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();

const cursor = useMemo(
() => readCursorFromParams(searchParams),
[searchParams],
  );
const limit = useMemo(
() => readLimitFromParams(searchParams),
[searchParams],
  );

const writeParams = useCallback(
(mutate: (params: URLSearchParams) => void) => {
const params = new URLSearchParams(Array.from(searchParams.entries()));
mutate(params);
assertNoForbiddenKeys(params);
const query = params.toString();
const next = query.length > 0 ? `${pathname}?${query}` : pathname;
router.replace(next, { scroll: false });
    },
[pathname, router, searchParams],
  );

const setCursor = useCallback(
(next: string | null) => {
writeParams((params) => {
if (next === null || next === "") {
params.delete(CURSOR_KEY);
        } else {
params.set(CURSOR_KEY, next);
        }
      });
    },
[writeParams],
  );

const setLimit = useCallback(
(next: number) => {

if (!Number.isFinite(next) || next <= 0) return;
const clamped = Math.min(Math.floor(next), SOCIAL_GRAPH_MAX_LIMIT);
writeParams((params) => {
if (clamped === SOCIAL_GRAPH_DEFAULT_LIMIT) {
params.delete(LIMIT_KEY);
        } else {
params.set(LIMIT_KEY, String(clamped));
        }
      });
    },
[writeParams],
  );

const reset = useCallback(() => {
writeParams((params) => {
params.delete(CURSOR_KEY);
params.delete(LIMIT_KEY);
    });
  }, [writeParams]);

useEffect(() => {
if (!searchParams.has(CURSOR_KEY) && !searchParams.has(LIMIT_KEY)) return;
reset();
    // We intentionally exclude `reset` and `searchParams` from the
    // dependency array: the effect should fire only when the user
    // id changes, not when the URL keys are mutated by setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

return { cursor, limit, setCursor, setLimit, reset };
}

export const __testing = {
CURSOR_KEY,
LIMIT_KEY,
SOCIAL_GRAPH_URL_KEYS,
readCursorFromParams,
readLimitFromParams,
assertNoForbiddenKeys,
};
