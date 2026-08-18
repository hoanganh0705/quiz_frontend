'use client';

import { Shield, MessageSquareWarning } from 'lucide-react';

import { AdminPageHeader } from '@/app/(protected)/admin/_components/AdminPageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

import { useAdminFeatureFlag } from '@/features/admin/hooks';
import { ReviewReportsList } from '@/features/admin/review-moderation/components/ReviewReportsList';

function ReviewReportsComingSoon(): React.ReactElement {
return (
<EmptyState
icon={MessageSquareWarning}
title="Review moderation coming soon"
description={
'Review moderation surfaces are not yet enabled. ' +
'Set NEXT_PUBLIC_ADMIN_REVIEW_MODERATION_LIVE=live to preview the feature.'
      }
size="md"
    />
  );
}

function ReviewReportsDisabled(): React.ReactElement {
return (
<EmptyState
icon={Shield}
title="Review moderation is disabled"
description={
'The admin_review_moderation_live feature flag is currently set ' +
'to a value other than "enabled". Toggle the flag to live to render ' +
'the moderation queue.'
      }
size="md"
    />
  );
}

export interface ReviewReportsPageProps {

onResolveReport?: never;
}

export function ReviewReportsPage(
_props: ReviewReportsPageProps = {},
): React.ReactElement {
const { isLive, value } = useAdminFeatureFlag('admin_review_moderation_live');

if (!isLive) {

if (value === 'placeholder') {
return <ReviewReportsComingSoon />;
    }
return <ReviewReportsDisabled />;
  }

return (
<div
className="flex flex-col gap-6"
data-testid="review-reports-page"
    >
<AdminPageHeader
title="Review moderation"
description="Triage and resolve reports filed against quiz reviews."
      />
<ReviewReportsList />
</div>
  );
}