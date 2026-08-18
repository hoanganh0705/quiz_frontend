

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
usePathname: vi.fn(),
}));

import { usePathname } from 'next/navigation';

import { AdminBreadcrumb } from '../AdminBreadcrumb';

function mockPathname(value: string | null) {
vi.mocked(usePathname).mockReturnValue(value ?? '/admin');
}

describe('AdminBreadcrumb', () => {
it('renders Admin / Tags for /admin/tags', () => {
mockPathname('/admin/tags');
render(<AdminBreadcrumb />);
expect(screen.getByTestId('admin-breadcrumb')).toBeInTheDocument();
expect(
screen.getByTestId('admin-breadcrumb-root-link'),
    ).toHaveTextContent('Admin');
expect(
screen.getByTestId('admin-breadcrumb-current'),
    ).toHaveTextContent('Tags');
  });

it('renders Admin / Tags / 123 for /admin/tags/123', () => {
mockPathname('/admin/tags/123');
render(<AdminBreadcrumb />);
expect(
screen.getByTestId('admin-breadcrumb-current'),
    ).toHaveTextContent('123');
const links = screen.getAllByTestId('admin-breadcrumb-link');
expect(links.map((l) => l.textContent)).toEqual(['Tags']);
  });

it('renders the last segment as plain text (not a link)', () => {
mockPathname('/admin/users');
render(<AdminBreadcrumb />);
const current = screen.getByTestId('admin-breadcrumb-current');
expect(current.tagName).toBe('SPAN');
expect(current.getAttribute('aria-current')).toBe('page');
  });

it('renders unknown segments with their raw segment text', () => {
mockPathname('/admin/xyz-unknown');
render(<AdminBreadcrumb />);
expect(
screen.getByTestId('admin-breadcrumb-current'),
    ).toHaveTextContent('xyz-unknown');
  });

it('renders only the Admin root link for /admin', () => {
mockPathname('/admin');
render(<AdminBreadcrumb />);
expect(
screen.getByTestId('admin-breadcrumb-root-link'),
    ).toBeInTheDocument();
expect(
screen.queryByTestId('admin-breadcrumb-current'),
    ).not.toBeInTheDocument();
  });
});
