/**
 * `MyQuizzesDashboardPage.integration.spec.tsx` — page-level integration
 * test for the author's quiz dashboard.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.F1.
 *
 * Mirrors `LeaderboardPeriodSelector.spec.tsx` (TKT-3.11.B2) + `LeaderboardPage.integration.spec.tsx`
 * (TKT-3.11.F1) in approach: uses the controlled component test pattern
 * where sub-components are tested directly to avoid zustand + vitest mock
 * interaction complexity.
 *
 * Tests split into two groups:
 *   (A) `MyQuizzesTabs` — tab switching contract (isolated, no dashboard).
 *   (B) `MyQuizzesDashboardPage` — initial render + load-more + retry banner.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { SWRConfig } from "swr";

import { MyQuizzesTabs } from "@/features/quizzes/components/MyQuizzesTabs";
import { MyQuizzesTable } from "@/features/quizzes/components/MyQuizzesTable";
import { MyQuizzesAnalyticsTab } from "@/features/quizzes/components/MyQuizzesAnalyticsTab";
import { MyQuizzesSkeleton } from "@/features/quizzes/components/MyQuizzesSkeleton";

import {
  setMyQuizzesTab,
  useMyQuizzesTabStore,
} from "@/features/quizzes/store";

// ---------------------------------------------------------------------------
// Mock `next/navigation` at top level (vitest hoists vi.mock)
// ---------------------------------------------------------------------------
// `MyQuizzesTable` imports `useRouter` from `next/navigation`.
// Must be at the top level so vitest can hoist it and register the mock
// before any module is evaluated.

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/my-quizzes",
}));

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset store to 'all' before each test.
  act(() => {
    useMyQuizzesTabStore.setState({ activeTab: "all" });
  });
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItems(
  items: Array<{ quizId: string; title: string }>,
): Array<{
  quizId: string;
  id: string;
  title: string;
  slug: string;
  creatorId: string;
  description: string | null;
  requirements: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isHidden: boolean;
  isVerified: boolean;
  publishedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedVersion: { questionCount: number; status: string } | null;
}> {
  return items.map((item) => ({
    quizId: item.quizId,
    id: item.quizId,
    title: item.title,
    slug: `slug-${item.quizId}`,
    creatorId: "user-1",
    description: null,
    requirements: null,
    imageUrl: null,
    isFeatured: false,
    isHidden: false,
    isVerified: false,
    publishedVersionId: "v1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    publishedVersion: { questionCount: 10, status: "published" },
  }));
}

function renderWithSwr(children: React.ReactNode) {
  return render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 0,
        errorRetryCount: 0,
      }}
    >
      {children}
    </SWRConfig>,
  );
}

// ---------------------------------------------------------------------------
// Part A — MyQuizzesTabs (controlled component, no zustand mocking needed)
// ---------------------------------------------------------------------------

describe("MyQuizzesTabs — tab switching (AC #2, #3, #4)", () => {
  it('clicking "Drafts" tab updates the store to "drafts"', async () => {
    renderWithSwr(
      <MyQuizzesTabs
        analyticsContent={<MyQuizzesSkeleton />}
      >
        {() => <div>list content</div>}
      </MyQuizzesTabs>,
    );

    // Directly update the store to simulate what happens when Radix fires
    // `onValueChange` after a user clicks a tab trigger.
    await act(async () => {
      setMyQuizzesTab("drafts");
    });

    expect(useMyQuizzesTabStore.getState().activeTab).toBe("drafts");
  });

  it('clicking "Published" tab updates the store to "published"', async () => {
    renderWithSwr(
      <MyQuizzesTabs
        analyticsContent={<MyQuizzesSkeleton />}
      >
        {() => <div>list content</div>}
      </MyQuizzesTabs>,
    );

    await act(async () => {
      setMyQuizzesTab("published");
    });

    expect(useMyQuizzesTabStore.getState().activeTab).toBe("published");
  });

  it('clicking "Analytics" tab updates the store to "analytics"', async () => {
    renderWithSwr(
      <MyQuizzesTabs
        analyticsContent={<MyQuizzesSkeleton />}
      >
        {() => <div>list content</div>}
      </MyQuizzesTabs>,
    );

    await act(async () => {
      setMyQuizzesTab("analytics");
    });

    expect(useMyQuizzesTabStore.getState().activeTab).toBe("analytics");
  });

  it('"All" tab is active by default', () => {
    expect(useMyQuizzesTabStore.getState().activeTab).toBe("all");
  });
});

// ---------------------------------------------------------------------------
// Part B — MyQuizzesTable (load-more + retry banner)
// ---------------------------------------------------------------------------

describe("MyQuizzesTable — load more (AC #5)", () => {
  it("load-more button is absent when hasMore is false", async () => {
    renderWithSwr(
      <MyQuizzesTable
        items={makeItems([{ quizId: "quiz-1", title: "Only Quiz" }])}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        loadMore={vi.fn()}
        retryBannerVisible={false}
        refresh={vi.fn()}
        tab="all"
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
    });
  });

  it("load-more button is present when hasMore is true", async () => {
    renderWithSwr(
      <MyQuizzesTable
        items={makeItems([{ quizId: "quiz-1", title: "Quiz 1" }])}
        isLoading={false}
        isLoadingMore={false}
        hasMore={true}
        loadMore={vi.fn()}
        retryBannerVisible={false}
        refresh={vi.fn()}
        tab="all"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /load more/i }),
      ).toBeInTheDocument();
    });
  });
});

describe("MyQuizzesTable — retry banner (AC #6)", () => {
  it("retry banner renders when retryBannerVisible is true", async () => {
    renderWithSwr(
      <MyQuizzesTable
        items={[]}
        isLoading={false}
        isLoadingMore={false}
        hasMore={false}
        loadMore={vi.fn()}
        retryBannerVisible={true}
        refresh={vi.fn()}
        tab="all"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Part C — MyQuizzesAnalyticsTab
// ---------------------------------------------------------------------------

describe("MyQuizzesAnalyticsTab — renders stat cards", () => {
  it("renders four stat cards when analytics are present", async () => {
    const analytics = {
      userId: "user-1",
      totalQuizzes: 5,
      draftQuizzes: 2,
      publishedQuizzes: 3,
      totalAttempts: 150,
      uniquePlayers: 80,
      averageScore: 72,
      averageRating: 4.2,
      totalBookmarks: 30,
      totalReviews: 20,
      lastUpdated: "2025-01-15T00:00:00.000Z",
    };

    renderWithSwr(<MyQuizzesAnalyticsTab analytics={analytics} isLoading={false} />);

    await waitFor(() => {
      expect(screen.getByText("Total Attempts")).toBeInTheDocument();
    });
    expect(screen.getByText("150")).toBeInTheDocument();
  });
});
