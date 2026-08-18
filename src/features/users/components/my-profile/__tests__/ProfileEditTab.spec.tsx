

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { ProfileEditTab } from '../ProfileEditTab';
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

vi.mock('@/features/users/hooks/useMyProfile', () => ({
useMyProfile: vi.fn(),
}));

vi.mock('@/features/users/hooks/useUpdateMyProfile', () => ({
useUpdateMyProfile: vi.fn().mockImplementation(() => ({
mutate: vi.fn(),
isPending: false,
isSuccess: false,
isError: false,
lastError: null,
lastApiError: null,
resetError: vi.fn(),
  })),
}));

vi.mock('@/features/auth/hooks/use-check-username', () => ({
useCheckUsername: vi.fn().mockImplementation(() => ({
status: 'idle',
  })),
isWellFormedUsername: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/forms/useDraftAutoSave', () => ({
useDraftAutoSave: vi.fn().mockImplementation(() => ({
savedAt: null,
restore: vi.fn(),
dismiss: vi.fn(),
  })),
}));

vi.mock('@/lib/forms/useUnsavedChangesGuard', () => ({
useUnsavedChangesGuard: vi.fn().mockImplementation(() => ({
pendingPopstate: false,
pendingPathname: null,
  })),
}));

import * as useMyProfileModule from '@/features/users/hooks/useMyProfile';

describe('ProfileEditTab', () => {
it('renders skeleton while isHydrated is false', () => {
(useMyProfileModule.useMyProfile as ReturnType<typeof vi.fn>).mockReturnValue({
profile: null,
isHydrated: false,
refetch: vi.fn(),
error: null,
    });

const { container } = render(<ProfileEditTab />);
expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

it('renders skeleton while profile is null (post-hydration)', () => {
(useMyProfileModule.useMyProfile as ReturnType<typeof vi.fn>).mockReturnValue({
profile: null,
isHydrated: true,
refetch: vi.fn(),
error: null,
    });

const { container } = render(<ProfileEditTab />);
expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

it('renders EditProfileForm when profile is non-null', () => {
(useMyProfileModule.useMyProfile as ReturnType<typeof vi.fn>).mockReturnValue({
profile: mockProfile,
isHydrated: true,
refetch: vi.fn(),
error: null,
    });

render(<ProfileEditTab />);

const displayNameInput = screen.queryByLabelText(/Display Name/i);
expect(displayNameInput).toBeInTheDocument();
  });
});
