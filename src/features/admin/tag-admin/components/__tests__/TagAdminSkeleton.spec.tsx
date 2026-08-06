/**
 * `__tests__/TagAdminSkeleton.spec.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.D3.
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TagAdminSkeleton } from '../TagAdminSkeleton';

describe('TagAdminSkeleton', () => {
  it('renders for active tab without crashing', () => {
    const { container } = render(<TagAdminSkeleton tab='active' />);
    expect(container).toBeInTheDocument();
  });

  it('renders for deleted tab without crashing', () => {
    const { container } = render(<TagAdminSkeleton tab='deleted' />);
    expect(container).toBeInTheDocument();
  });
});
