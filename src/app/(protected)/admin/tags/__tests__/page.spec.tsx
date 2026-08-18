

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import AdminTagsPage from '../page';

const mockAddTagAdminBreadcrumb = vi.hoisted(() => vi.fn());
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

vi.mock('@/lib/admin/admin_live_sentry', () => ({
addTagAdminBreadcrumb: (...args: unknown[]) => mockAddTagAdminBreadcrumb(...args),
}));

vi.mock('@/features/admin/hooks', () => ({
useAdminFeatureFlag: (...args: unknown[]) => mockUseAdminFeatureFlag(...args),
usePermission: (...args: unknown[]) => mockUsePermission(...args),
}));

vi.mock('../../../features/admin/tag-admin/hooks/useTagAdminList', () => ({
useTagAdminList: (...args: unknown[]) => mockUseTagAdminList(...args),
}));

vi.mock('../../../features/admin/tag-admin/hooks/useCreateTag', () => ({
useCreateTag: () => ({
create: vi.fn().mockResolvedValue({ tagId: 'tag-new', name: 'New Tag', slug: 'new-tag' }),
isPending: false,
error: null,
reset: vi.fn(),
  }),
}));

vi.mock('../../../features/admin/tag-admin/hooks/useUpdateTag', () => ({
useUpdateTag: () => ({
update: vi.fn().mockResolvedValue({ tagId: 'tag-1', name: 'Tag', slug: 'tag' }),
isPending: false,
error: null,
reset: vi.fn(),
  }),
}));

vi.mock('../../../features/admin/tag-admin/hooks/useDeleteTag', () => ({
useDeleteTag: () => ({
remove: vi.fn().mockResolvedValue(undefined),
isPending: false,
error: null,
reset: vi.fn(),
audit: { beforeTagId: null, afterTagId: null },
  }),
}));

vi.mock('../../../features/admin/tag-admin/hooks/useRestoreTag', () => ({
useRestoreTag: () => ({
restore: vi.fn().mockResolvedValue({ tagId: 'tag-del', name: 'Tag', slug: 'tag' }),
isPending: false,
error: null,
reset: vi.fn(),
  }),
}));

vi.mock('../../../features/admin/tag-admin/hooks/useTagSlugAvailability', () => ({
useTagSlugAvailability: () => ({
status: 'unknown' as const,
debouncedSlug: '',
conflictingTag: null,
  }),
}));

vi.mock('@/lib/forms/useToast', () => ({
useToast: () => ({ push: mockPush }),
DEFAULT_TOAST_DURATION_MS: 5000,
}));

vi.mock('next/navigation', () => ({
useRouter: () => ({
push: vi.fn(),
  }),
useSearchParams: vi.fn(() => ({
get: vi.fn((key: string) => (key === 'tab' ? 'active' : null)),
  })),
}));

describe('AdminTagsPage', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

afterEach(() => {
vi.restoreAllMocks();
  });

function renderPage() {
return render(
<SWRConfig value={{ provider: () => new Map() }}>
<AdminTagsPage />
</SWRConfig>,
    );
  }

it('emits a tag.admin.mount breadcrumb on mount', async () => {
renderPage();
expect(mockAddTagAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({
action: 'tag.admin.mount',
route: 'tag-admin.page',
status: 'started',
      }),
    );
  });

it('renders the page title', () => {
renderPage();
expect(screen.getByText('Tags')).toBeInTheDocument();
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
});
