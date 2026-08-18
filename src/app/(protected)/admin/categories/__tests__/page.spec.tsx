

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import AdminCategoriesPage from '../page';

const mockAddCategoryAdminBreadcrumb = vi.hoisted(() => vi.fn());
const mockUseAdminFeatureFlag = vi.hoisted(() =>
vi.fn((_flag?: unknown) => ({
isLive: false,
value: 'placeholder',
isPlaceholder: true,
  })),
);

vi.mock('@/lib/admin/admin_live_sentry', () => ({
addCategoryAdminBreadcrumb: (input: unknown) =>
mockAddCategoryAdminBreadcrumb(input),
}));

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: (flag?: unknown) => mockUseAdminFeatureFlag(flag),
}));

describe('AdminCategoriesPage', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

afterEach(() => {
vi.restoreAllMocks();
  });

function renderPage() {
return render(
<SWRConfig value={{ provider: () => new Map() }}>
<AdminCategoriesPage />
</SWRConfig>,
    );
  }

it('emits a category.admin.mount breadcrumb on mount', () => {
renderPage();
expect(mockAddCategoryAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({
action: 'category.admin.mount',
route: 'category-admin.page',
status: 'started',
      }),
    );
  });

it('renders the documented disabled notice when the flag is placeholder', () => {
mockUseAdminFeatureFlag.mockReturnValue({
isLive: false,
value: 'placeholder',
isPlaceholder: true,
    });
renderPage();
expect(
screen.getByText(/Category management coming soon/i),
    ).toBeInTheDocument();
  });

it('route file source contains no axios or fetch() calls', () => {
const source = readFileSync(
resolve(__dirname, '..', 'page.tsx'),
'utf-8',
    );
expect(source).not.toMatch(/from\s+['"]axios['"]/);
expect(source).not.toMatch(/\bfetch\(/);
  });
});