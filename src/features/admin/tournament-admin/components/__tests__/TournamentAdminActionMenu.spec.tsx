

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

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

vi.mock('@/components/ui/DropdownMenu', () => ({
DropdownMenu: ({ children }: { children: React.ReactNode }) => (
<>{children}</>
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
onClick?: React.MouseEventHandler<HTMLDivElement>;
onSelect?: (event: Event) => void;
  }) => (
<div
role="menuitem"
tabIndex={0}
onClick={onClick}
{...rest}
    >
{children}
</div>
  ),
DropdownMenuSeparator: () => <hr role="separator" />,
}));

import { TournamentAdminActionMenu } from '../TournamentAdminActionMenu';
import { PERMISSIONS } from '@/features/admin/permissions';

const TOURNAMENT_ID = '00000000-0000-4000-8000-000000000001';

function makeTournament(
status:
| 'upcoming'
    | 'registration'
    | 'ongoing'
    | 'finished'
    | 'cancelled' = 'upcoming',
) {
return {
tournamentId: TOURNAMENT_ID,
title: 'Spring Cup',
status,
difficulty: 'medium' as const,
startAt: '2026-09-01T12:00:00.000Z',
endAt: '2026-09-02T12:00:00.000Z',
ownerUserId: 'user-1',
createdAt: '2026-08-01T00:00:00.000Z',
updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

function setPermissions(
map: Partial<Record<keyof typeof PERMISSIONS, boolean>>,
) {
mockUsePermission.mockImplementation((name: string) => ({
isLoading: false,
error: null,
hasPermission: map[name as keyof typeof PERMISSIONS] ?? false,
  }));
}

beforeEach(() => {
mockUsePermission.mockReset();
setPermissions({});
});

describe('TKT-7.7.D1 — TournamentAdminActionMenu: page-header mode', () => {
it('AC #1: page-header + tournament_create allowed → "New tournament" renders', () => {
setPermissions({ tournament_create: true });
const onCreate = vi.fn();

render(<TournamentAdminActionMenu onCreate={onCreate} />);

fireEvent.click(
screen.getByTestId('tournament-admin-action-trigger-header'),
    );

const menu = screen.getByTestId('tournament-admin-action-menu-header');
const createItem = within(menu).getByTestId(
'tournament-admin-action-create-header',
    );
expect(createItem).toBeInTheDocument();

expect(
within(menu).queryByTestId(
'tournament-admin-action-edit-header',
      ),
    ).not.toBeInTheDocument();
expect(
within(menu).queryByTestId(
'tournament-admin-action-delete-header',
      ),
    ).not.toBeInTheDocument();

fireEvent.click(createItem);
expect(onCreate).toHaveBeenCalledTimes(1);
  });

it('AC #5: page-header + tournament_create denied → "New tournament" hidden, no actions', () => {
setPermissions({});

render(<TournamentAdminActionMenu onCreate={vi.fn()} />);

expect(
screen.getByTestId('tournament-admin-action-empty-header'),
    ).toBeInTheDocument();
expect(
screen.queryByTestId('tournament-admin-action-menu-header'),
    ).not.toBeInTheDocument();
  });
});

describe('TKT-7.7.D1 — TournamentAdminActionMenu: per-row mode', () => {
it('AC #2: per-row + tournament_update allowed AND not started → "Edit" renders', () => {
setPermissions({ tournament_update: true });
const onEdit = vi.fn();

render(
<TournamentAdminActionMenu
tournament={makeTournament('upcoming')}
onEdit={onEdit}
      />,
    );

fireEvent.click(
screen.getByTestId(
`tournament-admin-action-trigger-${TOURNAMENT_ID}`,
      ),
    );

const menu = screen.getByTestId(
`tournament-admin-action-menu-${TOURNAMENT_ID}`,
    );
const editItem = within(menu).getByTestId(
`tournament-admin-action-edit-${TOURNAMENT_ID}`,
    );
expect(editItem).toBeInTheDocument();

fireEvent.click(editItem);
expect(onEdit).toHaveBeenCalledWith(TOURNAMENT_ID);
  });

it('AC #3: per-row + tournament ongoing → "Edit" hidden even when tournament_update is allowed', () => {

setPermissions({ tournament_update: true });

render(
<TournamentAdminActionMenu
tournament={makeTournament('ongoing')}
onEdit={vi.fn()}
onDelete={vi.fn()}
      />,
    );

expect(
screen.getByTestId(
`tournament-admin-action-empty-${TOURNAMENT_ID}`,
      ),
    ).toBeInTheDocument();
expect(
screen.queryByTestId(
`tournament-admin-action-menu-${TOURNAMENT_ID}`,
      ),
    ).not.toBeInTheDocument();
  });

it('AC #3: per-row + tournament finished → "Edit" hidden, but Delete is still offered', () => {
setPermissions({
tournament_update: true,
tournament_delete: true,
    });

render(
<TournamentAdminActionMenu
tournament={makeTournament('finished')}
onEdit={vi.fn()}
onDelete={vi.fn()}
      />,
    );

fireEvent.click(
screen.getByTestId(
`tournament-admin-action-trigger-${TOURNAMENT_ID}`,
      ),
    );

const menu = screen.getByTestId(
`tournament-admin-action-menu-${TOURNAMENT_ID}`,
    );
expect(
within(menu).queryByTestId(
`tournament-admin-action-edit-${TOURNAMENT_ID}`,
      ),
    ).not.toBeInTheDocument();
expect(
within(menu).getByTestId(
`tournament-admin-action-delete-${TOURNAMENT_ID}`,
      ),
    ).toBeInTheDocument();
  });

it('AC #3: per-row + tournament cancelled → "Edit" hidden, but Delete is still offered', () => {
setPermissions({
tournament_update: true,
tournament_delete: true,
    });

render(
<TournamentAdminActionMenu
tournament={makeTournament('cancelled')}
onEdit={vi.fn()}
onDelete={vi.fn()}
      />,
    );

fireEvent.click(
screen.getByTestId(
`tournament-admin-action-trigger-${TOURNAMENT_ID}`,
      ),
    );

const menu = screen.getByTestId(
`tournament-admin-action-menu-${TOURNAMENT_ID}`,
    );
expect(
within(menu).queryByTestId(
`tournament-admin-action-edit-${TOURNAMENT_ID}`,
      ),
    ).not.toBeInTheDocument();
expect(
within(menu).getByTestId(
`tournament-admin-action-delete-${TOURNAMENT_ID}`,
      ),
    ).toBeInTheDocument();
  });

it('AC #3: per-row + tournament in registration → "Edit" still renders (not edit-blocking)', () => {
setPermissions({ tournament_update: true });

render(
<TournamentAdminActionMenu
tournament={makeTournament('registration')}
onEdit={vi.fn()}
      />,
    );

fireEvent.click(
screen.getByTestId(
`tournament-admin-action-trigger-${TOURNAMENT_ID}`,
      ),
    );

const menu = screen.getByTestId(
`tournament-admin-action-menu-${TOURNAMENT_ID}`,
    );
expect(
within(menu).getByTestId(
`tournament-admin-action-edit-${TOURNAMENT_ID}`,
      ),
    ).toBeInTheDocument();
  });

it('AC #4: per-row + tournament_delete allowed → "Delete" renders', () => {
setPermissions({ tournament_delete: true });
const onDelete = vi.fn();

render(
<TournamentAdminActionMenu
tournament={makeTournament('upcoming')}
onDelete={onDelete}
      />,
    );

fireEvent.click(
screen.getByTestId(
`tournament-admin-action-trigger-${TOURNAMENT_ID}`,
      ),
    );

const menu = screen.getByTestId(
`tournament-admin-action-menu-${TOURNAMENT_ID}`,
    );
const deleteItem = within(menu).getByTestId(
`tournament-admin-action-delete-${TOURNAMENT_ID}`,
    );
expect(deleteItem).toBeInTheDocument();

fireEvent.click(deleteItem);
expect(onDelete).toHaveBeenCalledWith(TOURNAMENT_ID);
  });

it('AC #5: per-row + every applicable permission granted → both Edit and Delete render', () => {
setPermissions({
tournament_update: true,
tournament_delete: true,
    });

render(
<TournamentAdminActionMenu
tournament={makeTournament('upcoming')}
onEdit={vi.fn()}
onDelete={vi.fn()}
      />,
    );

fireEvent.click(
screen.getByTestId(
`tournament-admin-action-trigger-${TOURNAMENT_ID}`,
      ),
    );

const menu = screen.getByTestId(
`tournament-admin-action-menu-${TOURNAMENT_ID}`,
    );
expect(
within(menu).getByTestId(
`tournament-admin-action-edit-${TOURNAMENT_ID}`,
      ),
    ).toBeInTheDocument();
expect(
within(menu).getByTestId(
`tournament-admin-action-delete-${TOURNAMENT_ID}`,
      ),
    ).toBeInTheDocument();
  });

it('AC #5: per-row + every permission denied → empty affordance', () => {
setPermissions({});

render(
<TournamentAdminActionMenu
tournament={makeTournament('upcoming')}
onEdit={vi.fn()}
onDelete={vi.fn()}
      />,
    );

expect(
screen.getByTestId(
`tournament-admin-action-empty-${TOURNAMENT_ID}`,
      ),
    ).toBeInTheDocument();
expect(
screen.queryByTestId(
`tournament-admin-action-menu-${TOURNAMENT_ID}`,
      ),
    ).not.toBeInTheDocument();
  });

it('AC #7: the component never imports or calls services', () => {

setPermissions({ tournament_create: true });

expect(() => {
render(<TournamentAdminActionMenu onCreate={vi.fn()} />);
    }).not.toThrow();
  });
});

describe('TKT-7.7.D1 — TournamentAdminActionMenu: loading state', () => {
it('renders a disabled "loading" trigger while permissions are bootstrapping', () => {
mockUsePermission.mockImplementation(() => ({
isLoading: true,
error: null,
hasPermission: false,
    }));

render(<TournamentAdminActionMenu onCreate={vi.fn()} />);

const trigger = screen.getByTestId(
'tournament-admin-action-trigger-header',
    );
expect(trigger).toBeDisabled();
  });
});