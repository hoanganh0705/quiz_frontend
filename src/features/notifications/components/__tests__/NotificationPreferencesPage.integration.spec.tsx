

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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

vi.mock('@/features/notifications/components/NotificationPreferencesForm', () => ({
NotificationPreferencesForm: () => (
<div data-testid="notification-preferences-form">Form</div>
  ),
}));

vi.mock('@/features/notifications/components/NotificationPlaceholder', () => ({
NotificationPlaceholder: () => (
<div data-testid="notification-placeholder">Placeholder</div>
  ),
}));

import { notificationMocks } from './test-helpers';
import { NotificationPreferencesPage } from '@/features/notifications/components/NotificationPreferencesPage';

describe('NotificationPreferencesPage (integration)', () => {
beforeEach(() => {
vi.clearAllMocks();
notificationMocks.useNotificationFeatureFlag.mockReturnValue({
isPlaceholder: false,
flagValue: 'live',
    });
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it('renders the form when feature flag is live', () => {
render(<NotificationPreferencesPage />);

expect(screen.getByTestId('notification-preferences-form')).toBeInTheDocument();
  });

it('renders the placeholder when feature flag is placeholder', () => {
notificationMocks.useNotificationFeatureFlag.mockReturnValue({
isPlaceholder: true,
flagValue: 'placeholder',
    });

render(<NotificationPreferencesPage />);

expect(screen.getByTestId('notification-placeholder')).toBeInTheDocument();
expect(screen.queryByTestId('notification-preferences-form')).not.toBeInTheDocument();
  });

it('renders the heading', () => {
render(<NotificationPreferencesPage />);

expect(
screen.getByRole('heading', { level: 1, name: /notification preferences/i }),
    ).toBeInTheDocument();
  });

it('renders the back link to /notifications', () => {
render(<NotificationPreferencesPage />);

const back = screen.getByRole('link', { name: /back to notifications/i });
expect(back).toBeInTheDocument();
expect(back.getAttribute('href')).toBe('/notifications');
  });

it('renders the page testid surface', () => {
render(<NotificationPreferencesPage />);

expect(screen.getByTestId('notification-preferences-page')).toBeInTheDocument();
  });
});
