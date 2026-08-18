

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { NotificationSettings } from '../NotificationSettings';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';

type NotificationChannels = {
inApp: boolean;
email: boolean;
push: boolean;
marketing: boolean;
};

function makeProfile(channels?: Partial<NotificationChannels>): UserMeResponseDto {
const defaults: NotificationChannels = {
inApp: true,
email: true,
push: true,
marketing: false,
  };
const merged = channels ? { ...defaults, ...channels } : defaults;
return {
userId: 'user-1',
username: 'johndoe',
email: 'john@example.com',
displayName: 'John Doe',
avatarUrl: null,
bio: null,
xpTotal: 0,
currentStreak: 0,
longestStreak: 0,
settings: { notificationChannels: merged },
createdAt: '2024-01-01T00:00:00.000Z',
updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

const mockState = {
mutate: vi.fn().mockResolvedValue(undefined),
isPending: false,
isSuccess: false,
isError: false,
lastError: null,
lastApiError: null,
resetError: vi.fn(),
};

vi.mock('@/features/users/hooks/useUpdateMySettings', () => ({
useUpdateMySettings: vi.fn().mockImplementation(() => mockState),
}));

describe('NotificationSettings', () => {
it('renders skeletons while profile is null', () => {
const { container } = render(<NotificationSettings profile={null} />);
expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

it('renders all four channel toggles', () => {
render(<NotificationSettings profile={makeProfile()} />);
expect(
screen.getByLabelText(/Toggle In-App Notifications/i),
    ).toBeInTheDocument();
expect(
screen.getByLabelText(/Toggle Email Channel/i),
    ).toBeInTheDocument();
expect(
screen.getByLabelText(/Toggle Push Channel/i),
    ).toBeInTheDocument();
expect(
screen.getByLabelText(/Toggle Marketing Channel/i),
    ).toBeInTheDocument();
  });

it('renders the header', () => {
render(<NotificationSettings profile={makeProfile()} />);
expect(
screen.getByRole('heading', {
level: 3,
name: /Notification Preferences/i,
      }),
    ).toBeInTheDocument();
  });

it('disables toggles while pending', () => {
mockState.isPending = true;
const { rerender } = render(
<NotificationSettings profile={makeProfile()} />,
    );
rerender(<NotificationSettings profile={makeProfile()} />);
const toggles = screen.getAllByRole('switch');
for (const toggle of toggles) {
expect(toggle).toBeDisabled();
    }
  });
});
