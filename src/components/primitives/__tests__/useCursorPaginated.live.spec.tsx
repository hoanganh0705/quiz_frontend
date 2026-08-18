

import { afterEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@testing-library/react";
import { mutate as swrMutate } from "swr";

import { SwrProvider } from "@/providers";
import { useCursorPaginated } from "@/lib/api";
import type { QuizListItemDto } from "@/lib/api/generated/schemas";
import type { CursorFetcher } from "@/lib/api/use-cursor-paginated.types";
import { logger } from "@/shared/log";

const RUN_LIVE = process.env.RUN_LIVE_API === "1";
const itLive = it.skipIf(!RUN_LIVE);

const SMOKE_KEY = ["quizzes", "smoke"] as const;

interface SmokeQuiz {
id: string;
quizId: string;
slug: string;
}

function makeSmokeFetcher(): CursorFetcher<SmokeQuiz, { limit: number }> {
return async ({ cursor, params }) => {

const { getQuizzes } = await import("@/lib/api");
const sdk = getQuizzes();
const result = await sdk.quizControllerListQuizzes({
limit: params.limit,
cursor: cursor ?? undefined
    });

const payload = result as unknown as {
data?: readonly QuizListItemDto[]
meta?: { pagination?: PaginationMeta }
    };
const rawItems = payload.data ?? [];
const meta = payload.meta?.pagination;
return {
items: rawItems.map((quiz): SmokeQuiz => ({
id: quiz.quizId,
quizId: quiz.quizId,
slug: quiz.slug
      })),
nextCursor: meta?.nextCursor ?? null,
hasNextPage: meta?.hasNextPage ?? false,
limit: params.limit
    };
  };
}

interface PaginationMeta {
kind?: string;
limit?: number;
nextCursor: string | null;
hasNextPage: boolean;
}

describe("TKT-3.2.E1 / useCursorPaginated — live /quizzes smoke", () => {
afterEach(async () => {

await swrMutate(
[...SMOKE_KEY, "useCursorPaginated", "cursor", 0, null],
undefined,
{ revalidate: false }
    );
  });

itLive(
"fetches the first page from the live /quizzes endpoint and supports loadMore",
async () => {
const fetcher = makeSmokeFetcher();
const { result } = renderHook(
() =>
useCursorPaginated<SmokeQuiz, { limit: number }>({
key: SMOKE_KEY,
fetcher,
params: { limit: 5 },
paginationKind: "cursor"
          }),
{ wrapper: SwrProvider }
      );

await waitFor(() => {
expect(result.current.items.length).toBeGreaterThanOrEqual(5);
      });

expect(typeof result.current.hasMore).toBe("boolean");

logger.debug(
"primitives.live-smoke",
"first item:",
JSON.stringify(result.current.items[0])
      );

if (result.current.hasMore) {
const before = result.current.items.length;
await act(async () => {
result.current.loadMore();
        });
await waitFor(() => {

const grew = result.current.items.length > before;
const ended = result.current.hasMore === false;
expect(grew || ended).toBe(true);
        });
      }
    },
15000 // 15s budget — live API calls can be slow.
  );

it("is gated by RUN_LIVE_API=1", () => {
expect(RUN_LIVE).toBe(false);

expect(typeof vi.fn()).toBe("function");
  });
});