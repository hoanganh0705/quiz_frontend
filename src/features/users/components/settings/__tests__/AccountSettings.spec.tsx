

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { AccountSettings } from '../AccountSettings';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';

const mockProfile: UserMeResponseDto = {
userId: 'user-1',
username: 'johndoe',
email: 'john@example.com',
displayName: 'John Doe',
avatarUrl: null,
bio: null,
xpTotal: 0,
currentStreak: 0,
longestStreak: 0,
settings: {},
createdAt: '2024-01-01T00:00:00.000Z',
updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockState = {
mutate: vi.fn().mockResolvedValue(undefined),
isPending: false,
isSuccess: false,
isError: false,
lastError: null,
lastApiError: null,
resetError: vi.fn(),
};

const mockUsernameState = { status: 'idle' as const, available: undefined };

vi.mock('@/features/users/hooks/useUpdateMyProfile', () => ({
useUpdateMyProfile: vi.fn().mockImplementation(() => mockState),
}));

vi.mock('@/features/auth/hooks/use-check-username', () => ({
useCheckUsername: vi.fn().mockImplementation(() => mockUsernameState),
}));

describe('AccountSettings', () => {
it('renders skeletons while profile is null', () => {
const { container } = render(<AccountSettings profile={null} />);
expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

it('renders form fields when profile is provided', () => {
render(<AccountSettings profile={mockProfile} />);
expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
expect(screen.getByLabelText(/Username.*read-only/i)).toBeInTheDocument();
expect(screen.getByLabelText(/Email address.*read-only/i)).toBeInTheDocument();
  });

it('renders the save button', () => {
render(<AccountSettings profile={mockProfile} />);
expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });

it('disables save button when form is not dirty', () => {
render(<AccountSettings profile={mockProfile} />);
expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
  });

it('disables save button while isPending', () => {
mockState.isPending = true;
const { rerender } = render(<AccountSettings profile={mockProfile} />);
rerender(<AccountSettings profile={mockProfile} />);
expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
  });
});
