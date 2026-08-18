

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
useRouter: () => ({
push: vi.fn(),
replace: vi.fn(),
back: vi.fn(),
refresh: vi.fn(),
prefetch: vi.fn(),
  }),
}));

vi.mock('@/features/notifications/hooks', async () => {
const actual =
await vi.importActual<typeof import('@/features/notifications/hooks')>(
'@/features/notifications/hooks',
    );
const installed = (await import('./test-helpers')).installNotificationMocks();
return {
...actual,
useNotifications: installed.useNotifications,
useUnreadNotificationCount: installed.useUnreadNotificationCount,
useNotificationSocket: installed.useNotificationSocket,
useMarkNotificationRead: installed.useMarkNotificationRead,
useMarkNotificationUnread: installed.useMarkNotificationUnread,
useDeleteNotification: installed.useDeleteNotification,
useNotificationPreferences: installed.useNotificationPreferences,
useNotificationFeatureFlag: installed.useNotificationFeatureFlag,
  };
});

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

import { notificationMocks, makeNotification } from './test-helpers';
import { NotificationItem } from '@/features/notifications/components/NotificationItem';

describe('NotificationItem', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

afterEach(() => {
vi.restoreAllMocks();
  });

describe('visual states', () => {
it('renders the unread visual state for isRead=false', () => {
const notification = makeNotification({ isRead: false });

render(<NotificationItem notification={notification} />);

const row = screen.getByTestId('notification-item');
expect(row.getAttribute('data-read')).toBe('false');
    });

it('renders the read visual state for isRead=true', () => {
const notification = makeNotification({ isRead: true });

render(<NotificationItem notification={notification} />);

const row = screen.getByTestId('notification-item');
expect(row.getAttribute('data-read')).toBe('true');
    });

it('renders the title and message', () => {
const notification = makeNotification({
title: 'Hello',
message: 'World',
      });

render(<NotificationItem notification={notification} />);

expect(screen.getByText('Hello')).toBeInTheDocument();
expect(screen.getByText('World')).toBeInTheDocument();
    });
  });

describe('mutations', () => {
it('clicking mark-read button triggers markRead', () => {
const notification = makeNotification({ isRead: false });
const markRead = vi.fn().mockResolvedValue(undefined);
notificationMocks.useMarkNotificationRead.mockReturnValue({
markRead,
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useMarkNotificationUnread.mockReturnValue({
markUnread: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useDeleteNotification.mockReturnValue({
deleteNotification: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });

render(<NotificationItem notification={notification} />);

const button = screen.getByRole('button', { name: /mark as read/i });
fireEvent.click(button);

expect(markRead).toHaveBeenCalled();
    });

it('clicking mark-unread button triggers markUnread', () => {
const notification = makeNotification({ isRead: true });
const markUnread = vi.fn().mockResolvedValue(undefined);
notificationMocks.useMarkNotificationRead.mockReturnValue({
markRead: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useMarkNotificationUnread.mockReturnValue({
markUnread,
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useDeleteNotification.mockReturnValue({
deleteNotification: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });

render(<NotificationItem notification={notification} />);

const button = screen.getByRole('button', { name: /mark as unread/i });
fireEvent.click(button);

expect(markUnread).toHaveBeenCalled();
    });

it('clicking delete triggers deleteNotification', () => {
const notification = makeNotification();
const deleteNotification = vi.fn().mockResolvedValue(undefined);
notificationMocks.useMarkNotificationRead.mockReturnValue({
markRead: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useMarkNotificationUnread.mockReturnValue({
markUnread: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useDeleteNotification.mockReturnValue({
deleteNotification,
state: 'idle',
error: null,
reset: vi.fn(),
      });

render(<NotificationItem notification={notification} />);

const button = screen.getByRole('button', { name: /delete notification/i });
fireEvent.click(button);

expect(deleteNotification).toHaveBeenCalled();
    });

it('hides delete button when hideDelete is true', () => {
const notification = makeNotification();

render(<NotificationItem notification={notification} hideDelete />);

expect(
screen.queryByRole('button', { name: /delete notification/i }),
      ).not.toBeInTheDocument();
    });
  });

describe('navigation', () => {
it('clicking the row triggers markRead for unread notifications', () => {
const notification = makeNotification({ isRead: false });
const markRead = vi.fn().mockResolvedValue(undefined);
notificationMocks.useMarkNotificationRead.mockReturnValue({
markRead,
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useMarkNotificationUnread.mockReturnValue({
markUnread: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useDeleteNotification.mockReturnValue({
deleteNotification: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });

render(<NotificationItem notification={notification} />);

const row = screen.getByTestId('notification-item');
fireEvent.click(row);

expect(markRead).toHaveBeenCalled();
    });

it('clicking the row does not call markRead for already-read notifications', () => {
const notification = makeNotification({ isRead: true });
const markRead = vi.fn().mockResolvedValue(undefined);
notificationMocks.useMarkNotificationRead.mockReturnValue({
markRead,
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useMarkNotificationUnread.mockReturnValue({
markUnread: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useDeleteNotification.mockReturnValue({
deleteNotification: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });

render(<NotificationItem notification={notification} />);

const row = screen.getByTestId('notification-item');
fireEvent.click(row);

expect(markRead).not.toHaveBeenCalled();
    });
  });

describe('keyboard accessibility', () => {
it('renders the row as a focusable element', () => {
const notification = makeNotification();

render(<NotificationItem notification={notification} />);

const row = screen.getByTestId('notification-item');
expect(row.getAttribute('tabindex')).toBe('0');
    });

it('responds to Enter key with markRead', () => {
const notification = makeNotification({ isRead: false });
const markRead = vi.fn().mockResolvedValue(undefined);
notificationMocks.useMarkNotificationRead.mockReturnValue({
markRead,
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useMarkNotificationUnread.mockReturnValue({
markUnread: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });
notificationMocks.useDeleteNotification.mockReturnValue({
deleteNotification: vi.fn(),
state: 'idle',
error: null,
reset: vi.fn(),
      });

render(<NotificationItem notification={notification} />);

const row = screen.getByTestId('notification-item');
fireEvent.keyDown(row, { key: 'Enter' });

expect(markRead).toHaveBeenCalled();
    });
  });
});
