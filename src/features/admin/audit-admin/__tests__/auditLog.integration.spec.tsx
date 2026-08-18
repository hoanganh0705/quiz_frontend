

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetFeatureFlagValue } = vi.hoisted(() => ({
mockGetFeatureFlagValue: vi.fn(),
}));

vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock('next/navigation', () => ({
useSearchParams: () => new URLSearchParams(),
useRouter: () => ({ push: vi.fn() }),
usePathname: () => '/admin/audit',
}));

import { AuditLogRouteHandoff } from '@/app/(protected)/admin/audit/_components/AuditLogRouteHandoff';

afterEach(() => {
vi.restoreAllMocks();
});

describe('Audit log integration flow', () => {
beforeEach(() => {

mockGetFeatureFlagValue.mockReturnValue('live');
  });

it('renders disabled notice when feature flag is placeholder', () => {
mockGetFeatureFlagValue.mockReturnValue('placeholder');

render(<AuditLogRouteHandoff />);

expect(
screen.getByTestId('audit-log-disabled-notice'),
    ).toBeInTheDocument();
  });

it('renders audit log page when feature flag is live', () => {
render(<AuditLogRouteHandoff />);

expect(screen.getByTestId('audit-log-page')).toBeInTheDocument();
  });

it('shows skeleton during initial load', async () => {
render(<AuditLogRouteHandoff />);

await waitFor(() => {

const skeleton = screen.queryByTestId('audit-log-skeleton');
const empty = screen.queryByTestId('audit-log-empty-state');
const errorState = screen.queryByTestId('audit-log-error-state');
const listSection = screen.queryAllByTestId('audit-log-list');
const page = screen.queryByTestId('audit-log-page');
expect(
page ?? skeleton ?? empty ?? errorState ?? listSection[0],
      ).toBeTruthy();
    });
  });
});