

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
