/**
 * `TournamentAdminItem.spec.tsx`
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.E1.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TournamentAdminItem } from '../TournamentAdminItem';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-dropdown">{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    asChild: _asChild,
    ...rest
  }: React.HTMLAttributes<HTMLElement> & {
    children: React.ReactNode;
    asChild?: boolean;
  }) => (
    <button type="button" {...rest}>
      {children}
    </button>
  ),
  DropdownMenuContent: ({
    children,
    ...rest
  }: React.HTMLAttributes<HTMLElement> & { children: React.ReactNode }) => (
    <div role="menu" {...rest}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    onSelect: _onSelect,
    ...rest
  }: React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode;
    onClick?: () => void;
    onSelect?: () => void;
  }) => (
    <div
      role="menuitem"
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => (
    <div role="separator" />
  ),
}));

vi.mock('@/features/tournaments/components/TournamentStatusBadge', () => ({
  TournamentStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="mock-status-badge">{status}</span>
  ),
}));

const mockUsePermission = vi.hoisted(
  () =>
    vi.fn((_name: string) => ({
      isLoading: false,
      error: null,
      hasPermission: false,
    })),
);

vi.mock('@/features/admin/hooks/usePermission', () => ({
  usePermission: (name: string) =>
    (mockUsePermission as unknown as (n: string) => ReturnType<typeof mockUsePermission>)(name),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TOURNAMENT_ID = '00000000-0000-4000-8000-000000000001';

function makeTournament(overrides?: Partial<{
  tournamentId: string;
  title: string;
  status: 'upcoming' | 'registration' | 'ongoing' | 'finished' | 'cancelled';
  difficulty: 'easy' | 'medium' | 'hard';
  startAt: string;
  endAt: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}>) {
  return {
    tournamentId: TOURNAMENT_ID,
    title: 'Spring Cup 2026',
    status: 'upcoming' as const,
    difficulty: 'medium' as const,
    startAt: '2026-09-01T12:00:00.000Z',
    endAt: '2026-09-02T12:00:00.000Z',
    ownerUserId: 'user-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TournamentAdminItem', () => {
  function renderItem(tournament: ReturnType<typeof makeTournament>) {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const result = render(
      <TournamentAdminItem
        tournament={tournament}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    return { ...result, onEdit, onDelete };
  }

  describe('layout', () => {
    it('renders title and status badge', () => {
      renderItem(makeTournament());
      expect(screen.getByTestId('tournament-admin-item-title')).toHaveTextContent(
        'Spring Cup 2026',
      );
      expect(screen.getByTestId('mock-status-badge')).toHaveTextContent('upcoming');
    });

    it('renders the view link pointing to the tournament detail', () => {
      renderItem(makeTournament());
      const link = screen.getByTestId('tournament-admin-item-view-link');
      expect(link).toHaveAttribute('href', `/tournaments/${TOURNAMENT_ID}`);
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('renders the tournament id data attribute', () => {
      renderItem(makeTournament());
      expect(screen.getByTestId('tournament-admin-item')).toHaveAttribute(
        'data-tournament-id',
        TOURNAMENT_ID,
      );
    });
  });

  describe('action menu', () => {
    function setPermissions(map: Record<string, boolean>) {
      mockUsePermission.mockImplementation((name: string) => ({
        isLoading: false,
        error: null,
        hasPermission: map[name] ?? false,
      }));
    }

    function openMenu() {
      const trigger = screen.getByTestId(
        `tournament-admin-action-trigger-${TOURNAMENT_ID}`,
      );
      trigger.click();
    }

    it('action menu isolation: clicking Edit does not navigate', () => {
      setPermissions({ tournament_update: true });
      const { onEdit } = renderItem(makeTournament());
      openMenu();
      const editItem = screen.getByTestId(
        `tournament-admin-action-edit-${TOURNAMENT_ID}`,
      );
      editItem.click();
      expect(onEdit).toHaveBeenCalledOnce();
      expect(onEdit).toHaveBeenCalledWith(TOURNAMENT_ID);
    });

    it('action menu isolation: clicking Delete does not navigate', () => {
      setPermissions({ tournament_delete: true });
      const { onDelete } = renderItem(makeTournament({ status: 'upcoming' }));
      openMenu();
      const deleteItem = screen.getByTestId(
        `tournament-admin-action-delete-${TOURNAMENT_ID}`,
      );
      deleteItem.click();
      expect(onDelete).toHaveBeenCalledOnce();
      expect(onDelete).toHaveBeenCalledWith(TOURNAMENT_ID);
    });

    it('ongoing tournament: Edit is hidden but Delete is present when both permissions granted', () => {
      setPermissions({ tournament_update: true, tournament_delete: true });
      const { onEdit, onDelete } = renderItem(
        makeTournament({ status: 'ongoing' }),
      );
      openMenu();
      expect(
        screen.queryByTestId(`tournament-admin-action-edit-${TOURNAMENT_ID}`),
      ).not.toBeInTheDocument();
      const deleteItem = screen.getByTestId(
        `tournament-admin-action-delete-${TOURNAMENT_ID}`,
      );
      deleteItem.click();
      expect(onDelete).toHaveBeenCalledOnce();
    });
  });
});
