import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationCenterPage } from "@/features/notifications/components/NotificationCenterPage";

import { notificationMocks, makeNotification } from "./test-helpers";

vi.mock("@/features/notifications/hooks", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/notifications/hooks")
  >("@/features/notifications/hooks");
  const installed = (await import("./test-helpers")).installNotificationMocks();
  return {
    ...actual,
    useNotifications: installed.useNotifications,
    useUnreadNotificationCount: installed.useUnreadNotificationCount,
    useNotificationSocket: installed.useNotificationSocket,
    useMarkNotificationRead: installed.useMarkNotificationRead,
    useMarkNotificationUnread: installed.useMarkNotificationUnread,
    useDeleteNotification: installed.useDeleteNotification,
    useDeleteAllNotifications: installed.useDeleteAllNotifications,
    useNotificationPreferences: installed.useNotificationPreferences,
      };
});

vi.mock("@/features/notifications/hooks/useNotifications", async () => {
  const installed = (await import("./test-helpers")).installNotificationMocks();
  return { useNotifications: installed.useNotifications };
});

vi.mock(
  "@/features/notifications/hooks/useUnreadNotificationCount",
  async () => {
    const installed = (
      await import("./test-helpers")
    ).installNotificationMocks();
    return { useUnreadNotificationCount: installed.useUnreadNotificationCount };
  },
);

vi.mock("@/features/notifications/hooks/useNotificationSocket", async () => {
  const installed = (await import("./test-helpers")).installNotificationMocks();
  return { useNotificationSocket: installed.useNotificationSocket };
});

vi.mock("@/features/notifications/hooks/useMarkNotificationRead", async () => {
  const installed = (await import("./test-helpers")).installNotificationMocks();
  return { useMarkNotificationRead: installed.useMarkNotificationRead };
});

vi.mock(
  "@/features/notifications/hooks/useMarkNotificationUnread",
  async () => {
    const installed = (
      await import("./test-helpers")
    ).installNotificationMocks();
    return { useMarkNotificationUnread: installed.useMarkNotificationUnread };
  },
);

vi.mock("@/features/notifications/hooks/useDeleteNotification", async () => {
  const installed = (await import("./test-helpers")).installNotificationMocks();
  return { useDeleteNotification: installed.useDeleteNotification };
});

vi.mock("@/features/notifications/hooks/useDeleteAllNotifications", async () => {
  const installed = (await import("./test-helpers")).installNotificationMocks();
  return { useDeleteAllNotifications: installed.useDeleteAllNotifications };
});

vi.mock(
  "@/features/notifications/hooks/useNotificationPreferences",
  async () => {
    const installed = (
      await import("./test-helpers")
    ).installNotificationMocks();
    return { useNotificationPreferences: installed.useNotificationPreferences };
  },
);

const mockMarkAllNotificationsRead = vi.fn();
vi.mock("@/features/notifications/services/notifications.service", () => ({
  markAllNotificationsRead: (...args: unknown[]) =>
    mockMarkAllNotificationsRead(...args),
}));

vi.mock("@/features/notifications/components/NotificationItem", () => ({
  NotificationItem: ({ notification }: { notification: { id: string } }) => (
    <div data-testid="notification-item" data-id={notification.id} />
  ),
}));

vi.mock("@/features/notifications/components/shared", () => ({
  NotificationListSkeleton: () => (
    <div data-testid="list-skeleton">Loading...</div>
  ),
  NotificationEmptyState: ({ variant }: { variant?: string }) => (
    <div data-testid="empty-state" data-variant={variant}>
      Empty
    </div>
  ),
  NotificationErrorState: ({
    onRetry,
  }: {
    error?: unknown;
    onRetry: () => void;
  }) => (
    <div data-testid="error-state">
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

vi.mock("@/components/ui/Tabs", () => {
  const Tabs = ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
  }) => (
    <div
      data-testid="tabs"
      ref={(el: HTMLElement | null) => {
        if (el) {
          (
            el as HTMLElement & { __onValueChange?: (v: string) => void }
          ).__onValueChange = onValueChange;
        }
      }}
    >
      {children}
    </div>
  );
  const TabsList = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  );
  const TabsTrigger = ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <button
      data-testid={`tab-${value}`}
      onClick={(e) => {
        const dispatcher = (e.currentTarget as HTMLElement).closest(
          '[data-testid="tabs"]',
        ) as (HTMLElement & { __onValueChange?: (v: string) => void }) | null;
        dispatcher?.__onValueChange?.(value);
      }}
    >
      {children}
    </button>
  );
  return { Tabs, TabsList, TabsTrigger };
});


describe("NotificationCenterPage (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
        notificationMocks.useNotifications.mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
      isStale: false,
    });
    mockMarkAllNotificationsRead.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("feature flag gating", () => {
    it.skip("renders the placeholder when feature flag is placeholder", () => {
      
      render(<NotificationCenterPage />);

      expect(
        screen.getByTestId("notification-placeholder"),
      ).toBeInTheDocument();
    });

    it("renders the live surface when feature flag is live", () => {
      render(<NotificationCenterPage />);

      expect(
        screen.getByTestId("notification-center-page"),
      ).toBeInTheDocument();
    });
  });

  describe("header surface", () => {
    it("renders the page heading", () => {
      render(<NotificationCenterPage />);

      expect(
        screen.getByRole("heading", { level: 1, name: /notifications/i }),
      ).toBeInTheDocument();
    });

    it("renders the preferences link", () => {
      render(<NotificationCenterPage />);

      const link = screen.getByRole("link", { name: /preferences/i });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute("href")).toBe("/notifications/preferences");
    });
  });

  describe("filters", () => {
    it("renders three filter tabs (All, Unread, Read)", () => {
      render(<NotificationCenterPage />);

      expect(screen.getByTestId("tab-all")).toBeInTheDocument();
      expect(screen.getByTestId("tab-unread")).toBeInTheDocument();
      expect(screen.getByTestId("tab-read")).toBeInTheDocument();
    });

    it("switches the unreadOnly filter when the Unread tab is clicked", async () => {
      render(<NotificationCenterPage />);

      fireEvent.click(screen.getByTestId("tab-unread"));

      await waitFor(() => {
        const lastCall =
          notificationMocks.useNotifications.mock.calls.at(-1)?.[0];
        expect(lastCall).toMatchObject({ unreadOnly: true });
      });
    });

    it("switches to false filter when the Read tab is clicked", async () => {
      render(<NotificationCenterPage />);

      fireEvent.click(screen.getByTestId("tab-read"));

      await waitFor(() => {
        const lastCall =
          notificationMocks.useNotifications.mock.calls.at(-1)?.[0];
        expect(lastCall).toMatchObject({ unreadOnly: false });
      });
    });
  });

  describe("mark-all-read action", () => {
    it("shows mark-all-read when unread notifications exist", () => {
      notificationMocks.useNotifications.mockReturnValue({
        items: [makeNotification({ isRead: false })],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: null,
        refresh: vi.fn().mockResolvedValue(undefined),
        isStale: false,
      });

      render(<NotificationCenterPage />);

      expect(
        screen.getByRole("button", { name: /mark all notifications as read/i }),
      ).toBeInTheDocument();
    });

    it("hides mark-all-read when all notifications are read", () => {
      notificationMocks.useNotifications.mockReturnValue({
        items: [makeNotification({ isRead: true })],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: null,
        refresh: vi.fn().mockResolvedValue(undefined),
        isStale: false,
      });

      render(<NotificationCenterPage />);

      expect(
        screen.queryByRole("button", {
          name: /mark all notifications as read/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe("list states", () => {
    it("renders empty state when there are no notifications", () => {
      notificationMocks.useNotifications.mockReturnValue({
        items: [],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: null,
        refresh: vi.fn().mockResolvedValue(undefined),
        isStale: false,
      });

      render(<NotificationCenterPage />);

      const empty = screen.getByTestId("empty-state");
      expect(empty).toBeInTheDocument();
      expect(empty.getAttribute("data-variant")).toBe("all");
    });

    it("renders list skeleton while loading", () => {
      notificationMocks.useNotifications.mockReturnValue({
        items: [],
        isLoading: true,
        isLoadingMore: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: null,
        refresh: vi.fn().mockResolvedValue(undefined),
        isStale: false,
      });

      render(<NotificationCenterPage />);

      expect(screen.getByTestId("list-skeleton")).toBeInTheDocument();
    });

    it("renders error state with retry on read failure", () => {
      const refresh = vi.fn().mockResolvedValue(undefined);
      notificationMocks.useNotifications.mockReturnValue({
        items: [],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: new Error("boom"),
        refresh,
        isStale: false,
      });

      render(<NotificationCenterPage />);

      expect(screen.getByTestId("error-state")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Retry"));
      expect(refresh).toHaveBeenCalled();
    });

    it("renders delete all button when notifications exist and opens confirmation", async () => {
      const mockDeleteAll = vi.fn().mockResolvedValue(undefined);
      notificationMocks.useDeleteAllNotifications.mockReturnValue({
        deleteAll: mockDeleteAll,
        state: "idle",
        error: null,
        reset: vi.fn(),
      });
      notificationMocks.useNotifications.mockReturnValue({
        items: [makeNotification({ id: "n1", isRead: true })],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: null,
        refresh: vi.fn().mockResolvedValue(undefined),
        isStale: false,
      });

      render(<NotificationCenterPage />);

      const deleteBtn = screen.getByTestId("notification-delete-all-button");
      expect(deleteBtn).toBeInTheDocument();

      fireEvent.click(deleteBtn);

      const confirmBtn = await screen.findByTestId(
        "notification-delete-all-confirm",
      );
      expect(confirmBtn).toBeInTheDocument();

      fireEvent.click(confirmBtn);
      expect(mockDeleteAll).toHaveBeenCalledTimes(1);
    });
  });
});
