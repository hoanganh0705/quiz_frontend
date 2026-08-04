/**
 * `NotificationBell.spec.tsx` — RTL integration tests for the notification bell.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.4.
 * Source ticket: TKT-5.4.G2.
 *
 * Tests cover:
 * - renders the bell trigger with badge and connection status
 * - renders null when feature flag is placeholder
 * - aria-label is set on the trigger button
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  useNotificationSocket: vi.fn(),
  getFeatureFlagValue: vi.fn(),
  // Component mocks (UnreadBadge / NotificationPopover / NotificationConnectionStatus)
  // are installed below.
}));

vi.mock('@/features/notifications/hooks/useNotificationSocket', () => ({
  useNotificationSocket: (...args: unknown[]) => mocks.useNotificationSocket(...args),
}));

vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mocks.getFeatureFlagValue(...args),
}));

// Mock the DropdownMenu primitives to avoid Radix runtime dependencies
// in the test environment.
vi.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-root">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
}));

vi.mock('@/features/notifications/components/UnreadBadge', () => ({
  UnreadBadge: () => <span data-testid="unread-badge-stub" />,
}));

vi.mock('@/features/notifications/components/NotificationPopover', () => ({
  NotificationPopover: () => <div data-testid="notification-popover-stub" />,
}));

vi.mock(
  '@/features/notifications/components/shared/NotificationConnectionStatus',
  () => ({
    NotificationConnectionStatus: () => (
      <span data-testid="notification-connection-status-stub" />
    ),
  }),
);

import { NotificationBell } from '@/features/notifications/components/NotificationBell';

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFeatureFlagValue.mockReturnValue('live');
    mocks.useNotificationSocket.mockReturnValue({
      isLive: false,
      connectionState: 'idle',
      socket: null,
      error: null,
      reconnect: vi.fn(),
      disconnect: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('feature flag gating', () => {
    it('renders null when feature flag is placeholder', () => {
      mocks.getFeatureFlagValue.mockReturnValue('placeholder');

      const { container } = render(<NotificationBell />);

      expect(container.firstChild).toBeNull();
    });

    it('renders the bell when feature flag is live', () => {
      mocks.getFeatureFlagValue.mockReturnValue('live');

      const { container } = render(<NotificationBell />);

      expect(container.querySelector('[data-testid="notification-bell"]')).toBeInTheDocument();
    });
  });

  describe('rendered surface', () => {
    it('renders the bell with an aria-label', () => {
      render(<NotificationBell />);

      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    });

    it('embeds the unread badge stub', () => {
      render(<NotificationBell />);

      expect(screen.getByTestId('unread-badge-stub')).toBeInTheDocument();
    });

    it('embeds the connection status indicator', () => {
      render(<NotificationBell />);

      expect(
        screen.getByTestId('notification-connection-status-stub'),
      ).toBeInTheDocument();
    });
  });
});
