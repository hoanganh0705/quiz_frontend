/**
 * `UnreadBadge.spec.tsx` — RTL integration tests for the unread badge.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.4.
 * Source ticket: TKT-5.4.G2.
 *
 * Tests cover:
 * - count 0 renders nothing
 * - count 1..99 shows the exact value
 * - count >= 100 shows "99+"
 * - dot mode renders the dot-only style
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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

import { notificationMocks } from './test-helpers';
import { UnreadBadge } from '@/features/notifications/components/UnreadBadge';

describe('UnreadBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when count is 0', () => {
    notificationMocks.useUnreadNotificationCount.mockReturnValue({
      unreadCount: 0,
      isLoading: false,
      error: null,
    });

    const { container } = render(<UnreadBadge />);

    expect(container.firstChild).toBeNull();
  });

  it('renders the exact count for values 1..99', () => {
    notificationMocks.useUnreadNotificationCount.mockReturnValue({
      unreadCount: 5,
      isLoading: false,
      error: null,
    });

    render(<UnreadBadge />);

    const badge = screen.getByTestId('unread-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute('data-count')).toBe('5');
  });

  it('shows "99+" when count >= 100', () => {
    notificationMocks.useUnreadNotificationCount.mockReturnValue({
      unreadCount: 250,
      isLoading: false,
      error: null,
    });

    render(<UnreadBadge />);

    const badge = screen.getByTestId('unread-badge');
    expect(badge.getAttribute('data-count')).toBe('99+');
  });

  it('shows "99+" when count is exactly 100', () => {
    notificationMocks.useUnreadNotificationCount.mockReturnValue({
      unreadCount: 100,
      isLoading: false,
      error: null,
    });

    render(<UnreadBadge />);

    const badge = screen.getByTestId('unread-badge');
    expect(badge.getAttribute('data-count')).toBe('99+');
  });

  it('shows exact 99 when count is 99', () => {
    notificationMocks.useUnreadNotificationCount.mockReturnValue({
      unreadCount: 99,
      isLoading: false,
      error: null,
    });

    render(<UnreadBadge />);

    const badge = screen.getByTestId('unread-badge');
    expect(badge.getAttribute('data-count')).toBe('99');
  });

  it('renders the dot style when dot is true', () => {
    notificationMocks.useUnreadNotificationCount.mockReturnValue({
      unreadCount: 3,
      isLoading: false,
      error: null,
    });

    render(<UnreadBadge dot />);

    expect(screen.getByTestId('unread-badge-dot')).toBeInTheDocument();
  });

  it('aria-hidden is true (paired with parent aria-label)', () => {
    notificationMocks.useUnreadNotificationCount.mockReturnValue({
      unreadCount: 7,
      isLoading: false,
      error: null,
    });

    render(<UnreadBadge />);

    const badge = screen.getByTestId('unread-badge');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
  });
});
