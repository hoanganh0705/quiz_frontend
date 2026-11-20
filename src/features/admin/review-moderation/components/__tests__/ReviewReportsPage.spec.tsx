import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ReviewReportsPage } from "@/features/admin/review-moderation/components/ReviewReportsPage";

const useAdminFeatureFlagMock = vi.hoisted(() =>
  vi.fn((_flag?: unknown) => ({
    isLive: false,
    value: "placeholder" as "placeholder" | "live" | "enabled" | "disabled",
    isPlaceholder: true,
  })),
);

const useReviewReportsMock = vi.hoisted(() =>
  vi.fn(() => ({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(async () => undefined),
    error: null,
    refresh: vi.fn(async () => undefined),
    retryBannerVisible: false,
    show: "pending" as "pending" | "resolved",
    setShow: vi.fn(),
  })),
);

vi.mock("@/features/admin/hooks/useAdminFeatureFlag", () => ({
  useAdminFeatureFlag: useAdminFeatureFlagMock,
}));

vi.mock("@/features/admin/review-moderation/hooks/useReviewReports", () => ({
  useReviewReports: useReviewReportsMock,
}));

vi.mock("@/features/admin/hooks", () => ({
  useAdminFeatureFlag: useAdminFeatureFlagMock,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReviewReportsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAdminFeatureFlagMock.mockReturnValue({
    isLive: false,
    value: "placeholder",
    isPlaceholder: true,
  });
  useReviewReportsMock.mockReturnValue({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(async () => undefined),
    error: null,
    refresh: vi.fn(async () => undefined),
    retryBannerVisible: false,
    show: "pending",
    setShow: vi.fn(),
  });
});

describe("ReviewReportsPage: flag gate", () => {
  it('renders the documented "coming soon" notice when the flag is "placeholder"', () => {
    useAdminFeatureFlagMock.mockReturnValue({
      isLive: false,
      value: "placeholder",
      isPlaceholder: true,
    });

    renderPage();
    expect(
      screen.getByText(/Review moderation coming soon/i),
    ).toBeInTheDocument();
  });

  it('renders the documented "disabled" notice when the flag value is non-live (e.g. "disabled")', () => {
    useAdminFeatureFlagMock.mockReturnValue({
      isLive: false,
      value: "disabled",
      isPlaceholder: false,
    });

    renderPage();
    expect(
      screen.getByText(/Review moderation is disabled/i),
    ).toBeInTheDocument();
  });

  it('renders the documented header + list when the flag is "live"', () => {
    useAdminFeatureFlagMock.mockReturnValue({
      isLive: true,
      value: "live",
      isPlaceholder: false,
    });

    renderPage();
    expect(
      screen.getByRole("heading", { name: /Review moderation/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("review-reports-list")).toBeInTheDocument();
  });

  it('renders the documented header + list when the flag is "enabled"', () => {
    useAdminFeatureFlagMock.mockReturnValue({
      isLive: true,
      value: "enabled",
      isPlaceholder: false,
    });

    renderPage();
    expect(
      screen.getByRole("heading", { name: /Review moderation/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("review-reports-list")).toBeInTheDocument();
  });

  it("reads the admin_review_moderation_live flag", () => {
    renderPage();
    expect(useAdminFeatureFlagMock).toHaveBeenCalledWith(
      "admin_review_moderation_live",
    );
  });
});

describe("ReviewReportsPage: no service imports", () => {
  it("the component source contains no axios or fetch() calls", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "..", "ReviewReportsPage.tsx"),
      "utf-8",
    );
    expect(source).not.toMatch(/from\s+['"]axios['"]/);
    expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
    expect(source).not.toMatch(
      /from\s+['"]@\/features\/admin\/services\/review-moderation\.service['"]/,
    );
  });
});
