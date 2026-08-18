

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { TagAdminPage } from '../TagAdminPage';

const mockUseAdminFeatureFlag = vi.hoisted(() =>
vi.fn(() => ({ isLive: true, flag: 'live', isPlaceholder: false })),
);
const mockUsePermission = vi.hoisted(() =>
vi.fn(() => ({ hasPermission: true, isLoading: false, error: null })),
);
const mockUseTagAdminList = vi.hoisted(() =>
vi.fn(() => ({
active: [],
softDeleted: [],
isLoading: false,
isValidating: false,
error: null,
mutate: vi.fn(),
  })),
);
const mockPush = vi.hoisted(() => vi.fn());
const mockMutate = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/hooks', () => ({
useAdminFeatureFlag: (...args: unknown[]) => mockUseAdminFeatureFlag(...args),
usePermission: (...args: unknown[]) => mockUsePermission(...args),
}));

vi.mock('../../hooks/useTagAdminList', () => ({
useTagAdminList: (...args: unknown[]) => mockUseTagAdminList(...args),
}));

vi.mock('@/lib/forms/useToast', () => ({
useToast: () => ({ push: mockPush }),
DEFAULT_TOAST_DURATION_MS: 5000,
}));

vi.mock('../../hooks/useCreateTag', () => ({
useCreateTag: () => ({
create: vi.fn().mockResolvedValue({ tagId: 'tag-new', name: 'New Tag', slug: 'new-tag' }),
isPending: false,
error: null,
reset: vi.fn(),
  }),
}));

vi.mock('../../hooks/useUpdateTag', () => ({
useUpdateTag: () => ({
update: vi.fn().mockResolvedValue({ tagId: 'tag-1', name: 'Tag', slug: 'tag' }),
isPending: false,
error: null,
reset: vi.fn(),
  }),
}));

vi.mock('../../hooks/useDeleteTag', () => ({
useDeleteTag: () => ({
remove: vi.fn().mockResolvedValue(undefined),
isPending: false,
error: null,
reset: vi.fn(),
audit: { beforeTagId: null, afterTagId: null },
  }),
}));

vi.mock('../../hooks/useRestoreTag', () => ({
useRestoreTag: () => ({
restore: vi.fn().mockResolvedValue({ tagId: 'tag-del', name: 'Tag', slug: 'tag' }),
isPending: false,
error: null,
reset: vi.fn(),
  }),
}));

vi.mock('../../hooks/useTagSlugAvailability', () => ({
useTagSlugAvailability: () => ({
status: 'unknown' as const,
debouncedSlug: '',
conflictingTag: null,
  }),
}));

vi.mock('next/navigation', () => ({
useRouter: () => ({
push: vi.fn(),
  }),
useSearchParams: vi.fn(() => ({
get: vi.fn((key: string) => (key === 'tab' ? 'active' : null)),
  })),
}));

describe('TagAdminPage', () => {
beforeEach(() => {
vi.clearAllMocks();
mockUseAdminFeatureFlag.mockReturnValue({
isLive: true,
flag: 'live',
isPlaceholder: false,
    });
mockUsePermission.mockReturnValue({
hasPermission: true,
isLoading: false,
error: null,
    });
mockUseTagAdminList.mockReturnValue({
active: [],
softDeleted: [],
isLoading: false,
isValidating: false,
error: null,
mutate: mockMutate,
    });
  });

function renderPage() {
return render(
<SWRConfig value={{ provider: () => new Map() }}>
<TagAdminPage />
</SWRConfig>,
    );
  }

it('renders the page title and description', () => {
renderPage();
expect(screen.getByText('Tags')).toBeInTheDocument();
expect(screen.getByText(/Organize and manage quiz tags/i)).toBeInTheDocument();
  });

it('renders the Add Tag CTA when flag is live and permission granted', () => {
renderPage();
expect(screen.getByText('Add Tag')).toBeInTheDocument();
  });

it('renders the coming-soon notice when flag is placeholder', () => {
mockUseAdminFeatureFlag.mockReturnValue({
isLive: false,
flag: 'placeholder',
isPlaceholder: true,
    });
renderPage();
expect(screen.getByText(/Tag management coming soon/i)).toBeInTheDocument();
  });

it('hides Add Tag CTA when permission denied', () => {
mockUsePermission.mockReturnValue({
hasPermission: false,
isLoading: false,
error: null,
    });
renderPage();
expect(screen.queryByText('Add Tag')).not.toBeInTheDocument();
  });
});
