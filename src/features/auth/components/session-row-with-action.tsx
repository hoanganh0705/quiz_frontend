'use client';

import { memo } from 'react';
import { SessionRow } from '@/features/auth/components/session-row';
import { useRevokeSession } from '@/features/auth/hooks/use-revoke-session';
import {
COPY_KEYS,
resolveCopy,
} from '@/features/auth/copy/security-copy';
import {
isSessionConflict,
isSessionErrorRetryable,
} from '@/features/auth/errors/session-error-mapper';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/loading-states/ErrorState';
import type { SessionListItemDto } from '@/lib/api';

export interface SessionRowWithActionProps {
session: SessionListItemDto;
listOps: {
mutate: (updater: (current: SessionListItemDto[]) => SessionListItemDto[]) => void;
revalidate: () => Promise<void>;
  };
}

function SessionRowWithActionInner({
session,
listOps,
}: SessionRowWithActionProps) {
const { revoke, status, error } = useRevokeSession({
sessionId: session.sessionId,
isCurrentSession: session.isCurrentSession,
session,
listOps,
  });

const pending = status === 'pending';
const showBanner =
status === 'error' &&
error !== null &&
(isSessionErrorRetryable(error.classification) ||
isSessionConflict(error.classification));

const bannerCopy = (() => {
if (!error) return null;
if (isSessionErrorRetryable(error.classification)) {
return {
title: COPY_KEYS.sessionList.error.revokeFailed.title,
body: COPY_KEYS.sessionList.error.revokeFailed.body,
      };
    }
if (isSessionConflict(error.classification)) {
return {
title: COPY_KEYS.sessionList.error.conflict.title,
body: COPY_KEYS.sessionList.error.conflict.body,
      };
    }
return null;
  })();

return (
<div
data-testid='session-row-with-action'
data-current={session.isCurrentSession}
    >
<SessionRow
session={session}
pending={pending}
onRevoke={session.isCurrentSession ? undefined : revoke}
      />
{showBanner && bannerCopy && (
<div className='pl-0 pb-3'>
<InlineError
message={`${resolveCopy(bannerCopy.title)} — ${resolveCopy(bannerCopy.body)}`}
          />
<Button
variant='ghost'
size='sm'
onClick={() => {
void revoke();
            }}
disabled={pending}
data-testid='session-row-retry-button'
          >
Retry
          </Button>
</div>
      )}
</div>
  );
}

export const SessionRowWithAction = memo(SessionRowWithActionInner);
