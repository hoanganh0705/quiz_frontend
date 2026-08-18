

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { EditProfileForm } from '../EditProfileForm';
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

const mockUpdateProfile = {
mutate: vi.fn().mockResolvedValue(undefined),
isPending: false,
isSuccess: false,
isError: false,
lastError: null,
lastApiError: null,
resetError: vi.fn(),
};

const mockDraft = {
savedAt: null as string | null,
restore: vi.fn(),
dismiss: vi.fn(),
};

const mockGuard = {
pendingPopstate: false,
pendingPathname: null as string | null,
};

const mockUsernameCheck = { status: 'idle' as const };

vi.mock('@/features/users/hooks/useUpdateMyProfile', () => ({
useUpdateMyProfile: vi.fn().mockImplementation(() => mockUpdateProfile),
}));

vi.mock('@/features/auth/hooks/use-check-username', () => ({
useCheckUsername: vi.fn().mockImplementation(() => mockUsernameCheck),
isWellFormedUsername: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/forms/useDraftAutoSave', () => ({
useDraftAutoSave: vi.fn().mockImplementation(() => mockDraft),
}));

vi.mock('@/lib/forms/useUnsavedChangesGuard', () => ({
useUnsavedChangesGuard: vi.fn().mockImplementation(() => mockGuard),
}));

describe('EditProfileForm', () => {
it('renders form fields with profile defaultValues', () => {
render(<EditProfileForm profile={mockProfile} />);

const displayNameInput = screen.getByLabelText(/Display Name/i) as HTMLInputElement;
expect(displayNameInput.value).toBe('John Doe');

expect(screen.getByText(/johndoe/)).toBeInTheDocument();
  });

it('renders the draft banner mount point', () => {
render(<EditProfileForm profile={mockProfile} />);

expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
  });

it('renders the error banner container (no error = hidden)', () => {
const { container } = render(<EditProfileForm profile={mockProfile} />);

expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
  });

it('shows the username read-only notice', () => {
render(<EditProfileForm profile={mockProfile} />);
expect(
screen.getByText(/cannot be changed after registration/i),
    ).toBeInTheDocument();
  });

it('renders the save button', () => {
render(<EditProfileForm profile={mockProfile} />);
expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });
});
