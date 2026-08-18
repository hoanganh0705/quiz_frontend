

'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Plus } from 'lucide-react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { usePermission } from '@/features/admin/hooks/usePermission';
import { AdminPageHeader } from '@/app/(protected)/admin/_components/AdminPageHeader';

import { TournamentAdminList } from './TournamentAdminList';
import type { TournamentAdminListHandle } from './TournamentAdminList';

import type React from 'react';

const DISABLED_NOTICE_COPY = {
title: 'Tournament Management',
description:
'Tournament management is not yet available in your environment. Please check back in a future release.',
} as const;

export interface TournamentAdminPageProps {
  // No required props — component is self-contained.
}

export interface TournamentAdminPageHandle {
  // Exposed for parent components if they need to trigger page-level actions.
}

export const TournamentAdminPage = forwardRef<
TournamentAdminPageHandle,
TournamentAdminPageProps
>(function TournamentAdminPage(_props, _ref): React.ReactElement {

const { value: flagValue } = useAdminFeatureFlag('admin_tournament_live');

const canCreate = usePermission('tournament_create');

const listRef = useRef<TournamentAdminListHandle | null>(null);

const handleNewTournament = useCallback(() => {
listRef.current?.requestCreate();
  }, []);

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
