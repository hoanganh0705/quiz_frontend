/**
 * `TournamentAdminPage` — top-level tournament admin surface.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.F1.
 *
 * ## What this component owns
 *
 *   1. **Page header** — title, description, and **New tournament** affordance
 *      (gated on `tournament_create` permission).
 *   2. **Feature-flag gate** — renders a disabled notice when
 *      `phase7_admin_tournament` is not `'enabled'`.
 *   3. **List integration** — mounts `TournamentAdminList` and opens the
 *      create dialog via the list's ref (`requestCreate`).
 *
 * ## No service calls
 *
 * This component is purely presentational. It composes existing hooks,
 * the list component, and the design-system page header.
 */

'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Plus } from 'lucide-react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { usePermission } from '@/features/admin/hooks/usePermission';
import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';

import { TournamentAdminList } from './TournamentAdminList';
import type { TournamentAdminListHandle } from './TournamentAdminList';

import type React from 'react';

// ─── Disabled notice ───────────────────────────────────────────────────────────

const DISABLED_NOTICE_COPY = {
  title: 'Tournament Management',
  description:
    'Tournament management is not yet available in your environment. Please check back in a future release.',
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TournamentAdminPageProps {
  // No required props — component is self-contained.
}

// ─── Ref API ───────────────────────────────────────────────────────────────────

export interface TournamentAdminPageHandle {
  // Exposed for parent components if they need to trigger page-level actions.
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TournamentAdminPage = forwardRef<
  TournamentAdminPageHandle,
  TournamentAdminPageProps
>(function TournamentAdminPage(_props, _ref): React.ReactElement {
  // ─── Feature flag ──────────────────────────────────────────────────────────

  const { value: flagValue } = useAdminFeatureFlag('phase7_admin_tournament');

  // ─── Permission ────────────────────────────────────────────────────────────

  const canCreate = usePermission('tournament_create');

  // ─── List ref (for opening create dialog from header) ───────────────────────

  const listRef = useRef<TournamentAdminListHandle | null>(null);

  const handleNewTournament = useCallback(() => {
    listRef.current?.requestCreate();
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  // Feature flag not yet enabled → render the disabled notice.
  if (flagValue !== 'live') {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <AdminPageHeader
          title={DISABLED_NOTICE_COPY.title}
          description={DISABLED_NOTICE_COPY.description}
        />
      </div>
    );
  }

  // Feature flag live → render the full admin surface.
  return (
    <div className="mx-auto max-w-3xl py-8 space-y-6">
      <AdminPageHeader
        title="Tournament Management"
        description="Create, edit, and delete tournaments. Filter by status or search by title."
        actionLabel={canCreate ? 'New tournament' : undefined}
        actionIcon={canCreate ? Plus : undefined}
        onAction={canCreate ? handleNewTournament : undefined}
      />
      <TournamentAdminList ref={listRef} />
    </div>
  );
});
