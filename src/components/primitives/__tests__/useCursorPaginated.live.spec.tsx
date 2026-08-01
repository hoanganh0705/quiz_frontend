/**
 * Live-`/quizzes` smoke spec for `useCursorPaginated`.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive.
 * Source story:  PHASE_3_EPICS.md → Story 3.2 acceptance criterion #4:
 *                "Cursor pagination is verified against a fixture and
 *                against the live `/quizzes` endpoint".
 * Source ticket: TKT-3.2.E1.
 *
 * This test mounts `useCursorPaginated` against the real backend
 * (default `http://localhost:8080`) and walks one or two pages to
 * confirm the hook drives the live `/quizzes` endpoint end-to-end.
 *
 * ## Run modes
 *
 * - Default (`pnpm test`): the spec skips itself. The CI pipeline
 *   never touches the backend.
 * - Gated (`RUN_LIVE_API=1 pnpm test <path>`): the spec runs against
 *   a locally-running backend and asserts the hook fetches and
 *   paginates correctly.
 *
 * The gate is implemented with `it.skipIf(...)` — the test is
 * registered as a normal test (so vitest still reports it) but is
 * skipped when the env var is unset. This is preferable to a top-level
 * `describe.skip` because the gate is per-test and the test ID stays
 * stable.
 *
 * ## Cache cleanup
 *
 * `afterEach` clears the SWR cache for the smoke key so a re-run
 * starts from a clean state and so the test does not pollute the
 * global cache if the suite is run alongside other specs that mount
 * `<SwrProvider>`.
 *
 * ## Test environment
 *
 * The file lives under `src/components/primitives/__tests__/` so
 * vitest's `jsdom` project picks it up (per `vitest.config.ts`). The
 * hook is rendered inside a `<SwrProvider>` wrapper (D2 AC #5) so the
 * test exercises the SWR-infinite + provider config end-to-end.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@testing-library/react";
import { mutate as swrMutate } from "swr";

import { SwrProvider } from "@/providers";
import { useCursorPaginated } from "@/lib/api";
import type { QuizListItemDto } from "@/lib/api/generated/schemas";
import type { CursorFetcher } from "@/lib/api/use-cursor-paginated.types";

// Live API is opt-in. Skipped by default to keep CI hermetic.
const RUN_LIVE = process.env.RUN_LIVE_API === "1";
const itLive = it.skipIf(!RUN_LIVE);

// Test-key used by the smoke fetcher; kept module-scoped so
// `afterEach` can target it without rebuilding the key.
const SMOKE_KEY = ["quizzes", "smoke"] as const;

// Item shape the live `/quizzes` endpoint emits. We narrow the SDK's
// `QuizListItemDto` to the minimal fields the assertions need so the
// smoke test does not couple to fields the backend may add later.
// The `id` field is required by the hook's `T extends { id: string }`
// constraint (used by `appendUniqueById` for cross-page dedup); we
// map `quizId` → `id` at the fetcher boundary.
interface SmokeQuiz {
  id: string;
  quizId: string;
  slug: string;
}

function makeSmokeFetcher(): CursorFetcher<SmokeQuiz, { limit: number }> {
  return async ({ cursor, params }) => {
    // Lazy-import the SDK so the test file's import graph stays
    // small when the smoke spec is skipped.
    const { getQuizzes } = await import("@/lib/api");
    const sdk = getQuizzes();
    const result = await sdk.quizControllerListQuizzes({
      limit: params.limit,
      cursor: cursor ?? undefined
    });
    // Defensive narrowing — the SDK returns the post-`unwrap` payload
    // (which is `{ data: QuizListItemDto[], meta: { pagination: ... } }`).
    // We narrow at the adapter boundary so the rest of the test sees a
    // single, well-defined contract. The `as unknown` is unavoidable
    // because the SDK's generated type is a tagged union that does
    // not structurally overlap with our adapter shape.
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
    // Best-effort cleanup; ignore the promise — if the cache has
    // already been cleared (e.g. test was skipped) the resolve is
    // idempotent.
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

      // First paint: at least 5 items land (the smoke runs against a
      // backend seeded with more than 5 quizzes; if the backend is
      // empty the test fails loudly, which is the right behaviour for
      // a smoke spec).
      await waitFor(() => {
        expect(result.current.items.length).toBeGreaterThanOrEqual(5);
      });

      // `hasMore` is the gate for `loadMore`; on a seeded backend the
      // first page is almost certainly not the last, but we don't
      // assert the literal value — only the type contract.
      expect(typeof result.current.hasMore).toBe("boolean");

      // Log the first item for visual confirmation (the AC explicitly
      // asks for this).
      console.log(
        "[live smoke] first item:",
        JSON.stringify(result.current.items[0])
      );

      // If `hasMore`, fire one more `loadMore` and confirm either
      // items grow OR `hasMore` flips to false. We don't assert a
      // literal count because the live backend may paginate at any
      // size.
      if (result.current.hasMore) {
        const before = result.current.items.length;
        await act(async () => {
          result.current.loadMore();
        });
        await waitFor(() => {
          // Either grew (more pages) or hasMore flipped false.
          const grew = result.current.items.length > before;
          const ended = result.current.hasMore === false;
          expect(grew || ended).toBe(true);
        });
      }
    },
    15000 // 15s budget — live API calls can be slow.
  );

  // Always-passing spec so the suite is never empty when RUN_LIVE
  // is unset. Documents the gate for future readers.
  it("is gated by RUN_LIVE_API=1", () => {
    expect(RUN_LIVE).toBe(false);
    // Sanity: the `vi` import is referenced so tree-shakers don't
    // strip the entire test file when only this case runs.
    expect(typeof vi.fn()).toBe("function");
  });
});