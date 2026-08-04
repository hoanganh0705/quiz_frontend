/**
 * `NotificationPopover.spec.tsx` — RTL integration tests for the popover.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.4.
 * Source ticket: TKT-5.4.G2.
 *
 * Tests cover:
 * - skeleton renders during loading
 * - empty state renders when there are no notifications
 * - error state renders on error with retry
 * - mark-all-read action visible only when unread notifications exist
 * - "View all" link points to /notifications
 * - connection status is rendered
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/features/notifications/hooks/useNotifications', async () => {
  const installed = (await import('./test-helpers')).installNotificationMocks();
  return { useNotifications: installed.useNotifications };
});

vi.mock('@/features/notifications/hooks/useUnreadNotificationCount', async () => {
  const installed = (await import('./test-helpers')).installNotificationMocks();
  return { useUnreadNotificationCount: installed.useUnreadNotificationCount };
});

vi.mock('@/features/notifications/hooks/useNotificationSocket', async () => {
  const installed = (await import('./test-helpers')).installNotificationMocks();
  return { useNotificationSocket: installed.useNotificationSocket };
});

vi.mock('@/features/notifications/hooks/useMarkNotificationRead', async () => {
  const installed = (await import('./test-helpers')).installNotificationMocks();
  return { useMarkNotificationRead: installed.useMarkNotificationRead };
});

vi.mock('@/features/notifications/hooks/useMarkNotificationUnread', async () => {
  const installed = (await import('./test-helpers')).installNotificationMocks();
  return { useMarkNotificationUnread: installed.useMarkNotificationUnread };
});

vi.mock('@/features/notifications/hooks/useDeleteNotification', async () => {
  const installed = (await import('./test-helpers')).installNotificationMocks();
  return { useDeleteNotification: installed.useDeleteNotification };
});

vi.mock('@/features/notifications/hooks/useNotificationPreferences', async () => {
  const installed = (await import('./test-helpers')).installNotificationMocks();
  return { useNotificationPreferences: installed.useNotificationPreferences };
});

vi.mock('@/features/notifications/hooks/useNotificationFeatureFlag', async () => {
  const installed = (await import('./test-helpers')).installNotificationMocks();
  return { useNotificationFeatureFlag: installed.useNotificationFeatureFlag };
});

const mockMarkAllNotificationsRead = vi.fn();
vi.mock('@/features/notifications/services/notifications.service', () => ({
  markAllNotificationsRead: (...args: unknown[]) => mockMarkAllNotificationsRead(...args),
}));

vi.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-group">{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-label">{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock('@/components/ui/ScrollArea', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock('@/features/notifications/components/NotificationItem', () => ({
  NotificationItem: ({ notification }: { notification: { id: string; title: string } }) => (
    <div data-testid="notification-item" data-id={notification.id}>
      {notification.title}
    </div>
  ),
}));

vi.mock('@/features/notifications/components/shared', () => ({
  NotificationEmptyState: ({ variant }: { variant?: string }) => (
    <div data-testid="empty-state" data-variant={variant}>Empty</div>
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
  NotificationListSkeleton: () => <div data-testid="list-skeleton">Loading...</div>,
  NotificationConnectionStatus: () => (
    <div data-testid="connection-status">Connection status</div>
  ),
}));

import { notificationMocks, makeNotification } from './test-helpers';
import { NotificationPopover } from '@/features/notifications/components/NotificationPopover';

describe('NotificationPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationMocks.useNotificationSocket.mockReturnValue({
      isLive: true,
      connectionState: 'connected',
      socket: { id: 'mock' },
      error: null,
      reconnect: vi.fn(),
      disconnect: vi.fn(),
    });
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

  describe('loading state', () => {
    it('renders the list skeleton during loading', () => {
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

      render(<NotificationPopover />);

      expect(screen.getByTestId('list-skeleton')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders the error state with retry action', () => {
      const refresh = vi.fn().mockResolvedValue(undefined);
      notificationMocks.useNotifications.mockReturnValue({
        items: [],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: new Error('boom'),
        refresh,
        isStale: false,
      });

      render(<NotificationPopover />);

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Retry'));
      expect(refresh).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('renders the empty state (variant unread) when there are no notifications', () => {
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

      render(<NotificationPopover />);

      const empty = screen.getByTestId('empty-state');
      expect(empty).toBeInTheDocument();
      expect(empty.getAttribute('data-variant')).toBe('unread');
    });
  });

  describe('rows and mark-all-read', () => {
    it('renders notification items', () => {
      notificationMocks.useNotifications.mockReturnValue({
        items: [
          makeNotification({ id: 'n1', notificationId: 'n1', title: 'Hello' }),
          makeNotification({ id: 'n2', notificationId: 'n2', title: 'World' }),
        ],
        isLoading: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: null,
        refresh: vi.fn().mockResolvedValue(undefined),
        isStale: false,
      });

      render(<NotificationPopover />);

      expect(screen.getAllByTestId('notification-item')).toHaveLength(2);
    });

    it('shows the mark-all-read action when at least one notification is unread', () => {
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

      render(<NotificationPopover />);

      expect(
        screen.getByRole('button', { name: /mark all as read/i }),
      ).toBeInTheDocument();
    });

    it('does not show mark-all-read when all notifications are already read', () => {
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

      render(<NotificationPopover />);

      expect(
        screen.queryByRole('button', { name: /mark all as read/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('view-all link', () => {
    it('renders the view-all link pointing to /notifications', () => {
      render(<NotificationPopover />);

      const link = screen.getByRole('link', { name: /view all/i });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toBe('/notifications');
    });
  });

  describe('connection status', () => {
    it('renders the connection status indicator', () => {
      render(<NotificationPopover />);

      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });
});
