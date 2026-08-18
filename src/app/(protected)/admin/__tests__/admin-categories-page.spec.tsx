

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import AdminCategoriesPage from '../categories/page';

vi.mock(
'@/features/admin/category-admin/components/CategoryAdminPage',
() => ({
CategoryAdminPage: vi.fn(() => (
<div data-testid='category-admin-page'>
<span>CategoryAdminPage rendered</span>
</div>
    )),
  }),
);

describe('AdminCategoriesPage', () => {
it('renders without crashing', () => {
const { container } = render(<AdminCategoriesPage />);
expect(container).toBeDefined();
  });

it('delegates to CategoryAdminPage', () => {
render(<AdminCategoriesPage />);
expect(screen.getByTestId('category-admin-page')).toBeInTheDocument();
  });
});