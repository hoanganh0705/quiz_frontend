

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

import { notificationMocks, FULL_PREFERENCES } from './test-helpers';
import { NotificationPreferencesForm } from '@/features/notifications/components/NotificationPreferencesForm';

describe('NotificationPreferencesForm', () => {
beforeEach(() => {
vi.clearAllMocks();
notificationMocks.useNotificationPreferences.mockReturnValue({
preferences: FULL_PREFERENCES,
isLoading: false,
error: null,
isUpdating: false,
isUpdated: false,
updateError: null,
update: vi.fn().mockResolvedValue(undefined),
reset: vi.fn(),
    });
  });

afterEach(() => {
vi.restoreAllMocks();
  });

describe('loading state', () => {
it('renders the skeleton while loading', () => {
notificationMocks.useNotificationPreferences.mockReturnValue({
preferences: null,
isLoading: true,
error: null,
isUpdating: false,
isUpdated: false,
updateError: null,
update: vi.fn().mockResolvedValue(undefined),
reset: vi.fn(),
      });

render(<NotificationPreferencesForm />);

expect(
screen.getByTestId('notification-preferences-form-skeleton'),
      ).toBeInTheDocument();
    });
  });

describe('toggles', () => {
it('renders the in-app notifications switch', () => {
render(<NotificationPreferencesForm />);

expect(screen.getByRole('switch', { name: /in-app notifications/i })).toBeInTheDocument();
    });

it('renders the email notifications switch', () => {
render(<NotificationPreferencesForm />);

expect(screen.getByRole('switch', { name: /email notifications/i })).toBeInTheDocument();
    });

it('renders the push notifications switch', () => {
render(<NotificationPreferencesForm />);

expect(screen.getByRole('switch', { name: /push notifications/i })).toBeInTheDocument();
    });

it('renders the achievement toggle', () => {
render(<NotificationPreferencesForm />);

expect(
screen.getByRole('switch', { name: /achievement & badge updates/i }),
      ).toBeInTheDocument();
    });

it('renders the tournament toggle', () => {
render(<NotificationPreferencesForm />);

expect(
screen.getByRole('switch', { name: /tournament activity/i }),
      ).toBeInTheDocument();
    });
  });

describe('inputs', () => {
it('renders the rank threshold input', () => {
render(<NotificationPreferencesForm />);

expect(screen.getByLabelText(/positions/i)).toBeInTheDocument();
    });

it('renders the quiet hours start input', () => {
render(<NotificationPreferencesForm />);

expect(screen.getByLabelText(/quiet hours start/i)).toBeInTheDocument();
    });

it('renders the quiet hours end input', () => {
render(<NotificationPreferencesForm />);

expect(screen.getByLabelText(/quiet hours end/i)).toBeInTheDocument();
    });
  });

describe('save success', () => {
it('renders the success message after a successful update', async () => {
notificationMocks.useNotificationPreferences.mockReturnValue({
preferences: FULL_PREFERENCES,
isLoading: false,
error: null,
isUpdating: false,
isUpdated: true,
updateError: null,
update: vi.fn().mockResolvedValue(undefined),
reset: vi.fn(),
      });

render(<NotificationPreferencesForm />);

await waitFor(() => {
expect(
screen.getByTestId('notification-preferences-update-success'),
        ).toBeInTheDocument();
      });
    });
  });

describe('save error', () => {
it('renders the update error banner after a failed update', () => {
notificationMocks.useNotificationPreferences.mockReturnValue({
preferences: FULL_PREFERENCES,
isLoading: false,
error: null,
isUpdating: false,
isUpdated: false,
updateError: new Error('Save failed'),
update: vi.fn().mockResolvedValue(undefined),
reset: vi.fn(),
      });

render(<NotificationPreferencesForm />);

expect(
screen.getByTestId('notification-preferences-update-error'),
      ).toBeInTheDocument();
    });
  });

describe('pending state', () => {
it('renders the pending indicator while updating', () => {
notificationMocks.useNotificationPreferences.mockReturnValue({
preferences: FULL_PREFERENCES,
isLoading: false,
error: null,
isUpdating: true,
isUpdated: false,
updateError: null,
update: vi.fn().mockResolvedValue(undefined),
reset: vi.fn(),
      });

render(<NotificationPreferencesForm />);

expect(
screen.getByTestId('notification-preferences-pending'),
      ).toBeInTheDocument();
    });
  });
});
