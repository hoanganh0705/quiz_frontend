

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AdminTournamentsPage from '../page';

const mockAddTournamentAdminBreadcrumb = vi.hoisted(() => vi.fn());
const mockUseAdminFeatureFlag = vi.hoisted(() =>
vi.fn((_flag?: unknown) => ({
isLive: false,
value: 'placeholder',
isPlaceholder: true,
  })),
);

vi.mock('@/lib/admin/admin_live_sentry', () => ({
addTournamentAdminBreadcrumb: (input: unknown) =>
mockAddTournamentAdminBreadcrumb(input),
}));

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: (flag?: unknown) => mockUseAdminFeatureFlag(flag),
}));

vi.mock('@/features/admin/tournament-admin/components/TournamentAdminPage', () => ({
TournamentAdminPage: () => (
<div data-testid="tournament-admin-page-mock">
Tournament Admin Page
    </div>
  ),
}));

vi.mock('../TournamentAdminList', () => ({
TournamentAdminList: ({
ref,
  }: {
ref?: React.RefObject<{ requestCreate: () => void } | null>;
  }) => {
if (ref && 'current' in ref) {
ref.current = {
requestCreate: vi.fn(),
      };
    }
return <div data-testid="tournament-admin-list-mock" />;
  },
}));

describe('AdminTournamentsPage', () => {
beforeEach(() => {
vi.clearAllMocks();
mockUseAdminFeatureFlag.mockReturnValue({
isLive: false,
value: 'placeholder',
isPlaceholder: true,
    });
  });

afterEach(() => {
vi.restoreAllMocks();
  });

function renderPage() {
return render(<AdminTournamentsPage />);
  }

it('emits a tournament-admin.mount breadcrumb on mount', () => {
renderPage();
expect(mockAddTournamentAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({
action: 'tournament-admin.mount',
route: 'tournament-admin.page',
status: 'started',
      }),
    );
  });

it('renders the documented disabled notice when the flag is placeholder', () => {
renderPage();
expect(
screen.getByText(/Tournament admin coming soon/i),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-admin-disabled-notice'),
    ).toBeInTheDocument();
  });

it('delegates to TournamentAdminPage when the flag is live', () => {
mockUseAdminFeatureFlag.mockReturnValue({
isLive: true,
value: 'live',
isPlaceholder: false,
    });
renderPage();
expect(
screen.queryByTestId('tournament-admin-disabled-notice'),
    ).not.toBeInTheDocument();
expect(
screen.getByTestId('tournament-admin-page-mock'),
    ).toBeInTheDocument();
  });

it('reads the admin_tournament_live flag', () => {
renderPage();
expect(mockUseAdminFeatureFlag).toHaveBeenCalledWith(
'admin_tournament_live',
    );
  });

it('route file source contains no axios or fetch() calls', () => {
const source = readFileSync(
resolve(__dirname, '..', 'page.tsx'),
'utf-8',
    );
expect(source).not.toMatch(/from\s+['"]axios['"]/);
expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
  });

it('handoff file source contains no axios or fetch() calls', () => {
const source = readFileSync(
resolve(__dirname, '..', '_components', 'TournamentAdminRouteHandoff.tsx'),
'utf-8',
    );
expect(source).not.toMatch(/from\s+['"]axios['"]/);
expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
  });

it('route file delegates to TournamentAdminRouteHandoff', () => {
const source = readFileSync(
resolve(__dirname, '..', 'page.tsx'),
'utf-8',
    );
expect(source).toMatch(/TournamentAdminRouteHandoff/);
expect(source).toMatch(/return\s+<TournamentAdminRouteHandoff\s*\/>/);
  });
});
