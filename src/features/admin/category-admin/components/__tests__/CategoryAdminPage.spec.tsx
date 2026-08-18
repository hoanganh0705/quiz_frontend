

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { CategoryAdminPage } from '../CategoryAdminPage';

const mockIsLive = vi.hoisted(() => ({ value: false }));
const mockUseAdminFeatureFlag = vi.hoisted(() =>
vi.fn(() => ({ isLive: mockIsLive.value, isLoading: false })),
);

const mockHasPermission = vi.hoisted(() => ({ value: true }));
const mockUsePermission = vi.hoisted(() =>
vi.fn(() => ({
hasPermission: mockHasPermission.value,
isLoading: false,
error: null,
  })),
);

const mockPushToast = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/hooks', () => ({
useAdminFeatureFlag: () => mockUseAdminFeatureFlag(),
usePermission: () => mockUsePermission(),
}));

vi.mock('@/lib/forms/useToast', () => ({
useToast: () => ({ push: mockPushToast }),
DEFAULT_TOAST_DURATION_MS: 4000,
}));

vi.mock('../cache/category-cross-tab', () => ({
subscribeCategoryAdminInvalidate: () => () => {},
}));

vi.mock('@/features/admin/category-admin/components/CategoryAdminList', () => ({
CategoryAdminList: () => (
<div data-testid='category-admin-list'>CategoryAdminList</div>
  ),
}));

vi.mock('@/features/admin/category-admin/components/CategoryCreateDialog', () => ({
CategoryCreateDialog: () => (
<div data-testid='category-create-dialog'>CategoryCreateDialog</div>
  ),
}));

function renderPage() {
return render(
<SWRConfig value={{ provider: () => new Map() }}>
<CategoryAdminPage />
</SWRConfig>,
  );
}

describe('CategoryAdminPage', () => {
beforeEach(() => {
vi.clearAllMocks();
mockIsLive.value = false;
mockHasPermission.value = true;
mockUseAdminFeatureFlag.mockImplementation(() => ({
isLive: mockIsLive.value,
isLoading: false,
    }));
mockUsePermission.mockImplementation(() => ({
hasPermission: mockHasPermission.value,
isLoading: false,
error: null,
    }));
  });

it('renders the disabled notice when the feature flag is "placeholder"', () => {
mockIsLive.value = false;
renderPage();
expect(
screen.getByText(/Category management coming soon/i),
    ).toBeInTheDocument();
  });

it('does NOT render the list when the feature flag is "placeholder"', () => {
mockIsLive.value = false;
renderPage();
expect(screen.queryByTestId('category-admin-list')).not.toBeInTheDocument();
  });

it('renders the header and list when the feature flag is "live"', () => {
mockIsLive.value = true;
renderPage();
expect(screen.getByRole('heading', { name: /Categories/i })).toBeInTheDocument();
expect(screen.getByTestId('category-admin-list')).toBeInTheDocument();
  });

it('hides the Add Category CTA when permission is denied', () => {
mockIsLive.value = true;
mockHasPermission.value = false;
renderPage();
expect(
screen.queryByRole('button', { name: /Add Category/i }),
    ).not.toBeInTheDocument();
  });

it('shows the Add Category CTA when permission is granted', () => {
mockIsLive.value = true;
mockHasPermission.value = true;
renderPage();
expect(
screen.getByRole('button', { name: /Add Category/i }),
    ).toBeInTheDocument();
  });

it('renders the create dialog tree (passes through to CategoryCreateDialog)', () => {
mockIsLive.value = true;
renderPage();
expect(screen.getByTestId('category-create-dialog')).toBeInTheDocument();
  });
});