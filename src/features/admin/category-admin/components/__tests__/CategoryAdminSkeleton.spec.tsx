/**
 * `__tests__/CategoryAdminSkeleton.spec.tsx`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.D3.
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CategoryAdminSkeleton } from '../CategoryAdminSkeleton';

describe('CategoryAdminSkeleton', () => {
  it('renders without crashing in active tab', () => {
    const { container } = render(<CategoryAdminSkeleton tab='active' />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders without crashing in deleted tab', () => {
    const { container } = render(<CategoryAdminSkeleton tab='deleted' />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the tab header skeletons', () => {
    const { container } = render(<CategoryAdminSkeleton tab='active' />);
    // Two tab header skeletons (active + deleted width)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });
});