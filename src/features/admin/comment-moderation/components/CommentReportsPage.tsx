'use client';

import { Shield, MessageSquareWarning } from 'lucide-react';

import { AdminPageHeader } from '@/app/(protected)/admin/_components/AdminPageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

import { useAdminFeatureFlag } from '@/features/admin/hooks';
import { CommentReportsList } from '@/features/admin/comment-moderation/components/CommentReportsList';

function CommentReportsComingSoon(): React.ReactElement {
return (
<EmptyState
icon={MessageSquareWarning}
title="Comment moderation coming soon"
description={
'Comment moderation surfaces are not yet enabled. ' +
'Set NEXT_PUBLIC_ADMIN_COMMENT_MODERATION_LIVE=live to preview the feature.'
      }
size="md"
    />
  );
}

function CommentReportsDisabled(): React.ReactElement {
return (
<EmptyState
icon={Shield}
title="Comment moderation is disabled"
description={
'The admin_comment_moderation_live feature flag is currently set ' +
'to a value other than "enabled". Toggle the flag to live to render ' +
'the moderation queue.'
      }
size="md"
    />
  );
}

export interface CommentReportsPageProps {

onResolveReport?: never;
}

export function CommentReportsPage(
_props: CommentReportsPageProps = {},
): React.ReactElement {
const { isLive, value } = useAdminFeatureFlag('admin_comment_moderation_live');

if (!isLive) {

if (value === 'placeholder') {
return <CommentReportsComingSoon />;
    }
return <CommentReportsDisabled />;
  }

return (
<div
className="flex flex-col gap-6"
data-testid="comment-reports-page"
    >
<AdminPageHeader
title="Comment moderation"
description="Triage and resolve reports filed against quiz comments. Toggle between pending and resolved queues from the list header."
      />
<CommentReportsList />
</div>
  );
}