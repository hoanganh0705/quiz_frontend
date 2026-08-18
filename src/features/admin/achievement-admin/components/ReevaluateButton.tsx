'use client';

import { useCallback, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/loading-states/LoadingSpinner';
import { ApiError } from '@/lib/api/core/ApiError';
import { getUserCopy } from '@/lib/api/error-codes';

import { usePermission } from '@/features/admin/hooks/usePermission';

import { useReevaluateUserAchievements } from '../hooks';

export interface ReevaluateButtonProps {

userId: string;

onCompleted?: () => void;
}

export function ReevaluateButton({ userId, onCompleted }: ReevaluateButtonProps) {
const { hasPermission, isLoading } = usePermission('achievement_reevaluate');
const { reevaluate, lifecycle, isPending, error, reset } =
useReevaluateUserAchievements(userId);

useEffect(() => {
if (lifecycle === 'completed') {
onCompleted?.();
    }
  }, [lifecycle, onCompleted]);

useEffect(() => {
return () => {
reset();
    };
    // Only reset on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

if (!hasPermission && !isLoading) {
return <PermissionDeniedNoticeInline variant="control" />;
  }

if (isLoading) {

return (
<Button variant="secondary" disabled>
<LoadingSpinner size="sm" />
Checking permissions…
      </Button>
    );
  }

const isRunning = lifecycle === 'running';
const isCompleted = lifecycle === 'completed';
const isFailed = lifecycle === 'failed';

const label =
lifecycle === 'idle'
? 'Re-evaluate achievements'
: lifecycle === 'running'
? 'Re-evaluation running…'
: lifecycle === 'completed'
? 'Re-evaluate again'
: 'Retry re-evaluation';

const variant = isRunning ? 'secondary' : 'default';

const showRevalRunningNotice =
error !== null && error.code === 'REVAL_RUNNING';

return (
<div className="flex flex-col gap-2">
{showRevalRunningNotice && (
<p
role="status"
aria-live="polite"
className="text-sm text-muted-foreground"
data-testid="reevaluate-reval-running-notice"
        >
{getUserCopy(error.code).body}
</p>
      )}

<Button
variant={variant}
disabled={isRunning || isPending}
onClick={() => {
if (!isRunning && !isPending) {
reevaluate().catch(() => {
              // Error is captured in hook state; rendered below.
            });
          }
        }}
data-testid="reevaluate-button"
      >
{isRunning && <LoadingSpinner size="sm" />}
{label}
</Button>

{error !== null && error.code !== 'REVAL_RUNNING' && (
<RequestIdBannerInline error={error} />
      )}
</div>
  );
}

function PermissionDeniedNoticeInline({
variant,
}: {
variant: 'control' | 'route';
}) {
return (
<p
className="text-sm text-muted-foreground"
data-testid="permission-denied-notice"
    >
{variant === 'control'
? 'This action is not available for your account.'
: 'This page is restricted to administrators.'}
</p>
  );
}

function RequestIdBannerInline({ error }: { error: ApiError }) {
const requestId = error.requestId;
if (!requestId) return null;
return (
<div
role="alert"
aria-live="polite"
data-testid="admin-request-id-banner"
className="mt-1 rounded border border-border bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground"
    >
<span className="font-semibold">Request ID: </span>
{requestId}
</div>
  );
}
