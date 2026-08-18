

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import AdminTagsPage from '../tags/page';

vi.mock(
'@/features/admin/tag-admin/components/TagAdminPage',
() => ({
TagAdminPage: vi.fn(() => (
<div data-testid='tag-admin-page'>
<span>TagAdminPage rendered</span>
</div>
    )),
  }),
);

describe('AdminTagsPage', () => {
it('renders without crashing', () => {
const { container } = render(<AdminTagsPage />);
expect(container).toBeDefined();
  });

it('delegates to TagAdminPage', () => {
render(<AdminTagsPage />);
expect(screen.getByTestId('tag-admin-page')).toBeInTheDocument();
  });
});
