'use client';

import { memo, useCallback } from 'react';
import { MoreHorizontal } from 'lucide-react';

import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuSeparator,
DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

import { usePermission } from '@/features/admin/hooks/usePermission';
import { PermissionDeniedNotice } from '@/features/admin/components/PermissionDeniedNotice';
import { PERMISSIONS } from '@/features/admin/permissions';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';

import {
COMMENT_REPORT_ACTIONS,
COMMENT_REPORT_CONSUMER_ACTIONS,
type CommentReportConsumerAction,
} from '../action-enum';
import { isCommentSelfModerationAttempt } from '../comment-id-validation';
import type { CommentReportDto } from '../admin-comment-report-types';

export interface CommentReportActionMenuProps {

report: CommentReportDto;

commentAuthorId: string | null;

onAction: (action: CommentReportConsumerAction) => void;

className?: string;
}

export const CommentReportActionMenu = memo(function CommentReportActionMenu({
report,
commentAuthorId,
onAction,
className,
}: CommentReportActionMenuProps): React.ReactElement {
const permission = usePermission(PERMISSIONS.comment_report_update);
const { currentUser } = useAuthSession();

const isSelfAttempt = isCommentSelfModerationAttempt(
commentAuthorId,
currentUser?.userId ?? null,
  );

const handleSelect = useCallback(
(action: CommentReportConsumerAction) => () => {
onAction(action);
    },
[onAction],
  );

if (permission.isLoading) {
return (
<button
type="button"
className={[
'flex h-8 w-8 cursor-progress items-center justify-center',
'rounded-md text-muted-foreground',
className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
aria-label="Loading actions"
data-testid={`comment-report-action-trigger-${report.reportId}`}
disabled
      >
<MoreHorizontal className="h-4 w-4" aria-hidden="true" />
</button>
    );
  }

if (!permission.hasPermission) {
return (
<div
data-testid={`comment-report-permission-denied-${report.reportId}`}
      >
<PermissionDeniedNotice variant="control" />
</div>
    );
  }

if (isSelfAttempt) {
return (
<div
role="note"
className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
data-testid={`comment-report-self-moderation-notice-${report.reportId}`}
      >
You can&apos;t moderate a report about a comment you wrote.
      </div>
    );
  }

return (
<DropdownMenu>
<DropdownMenuTrigger asChild>
<button
type="button"
className={[
'flex h-8 w-8 items-center justify-center rounded-md',
'text-muted-foreground transition-colors',
'hover:bg-muted hover:text-foreground',
'focus-visible:outline-none focus-visible:ring-2',
'focus-visible:ring-ring focus-visible:ring-offset-2',
className ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
aria-label="Comment report actions"
data-testid={`comment-report-action-trigger-${report.reportId}`}
        >
<MoreHorizontal className="h-4 w-4" aria-hidden="true" />
</button>
</DropdownMenuTrigger>

<DropdownMenuContent
align="end"
className="w-56"
data-testid={`comment-report-action-menu-${report.reportId}`}
      >
{COMMENT_REPORT_CONSUMER_ACTIONS.map((action, index) => {
const metadata = COMMENT_REPORT_ACTIONS[action];
const isIrreversible = !metadata.reversible;

const previousAction = index > 0 ? COMMENT_REPORT_CONSUMER_ACTIONS[index - 1] : null;
const showSeparator =
previousAction !== null &&
COMMENT_REPORT_ACTIONS[previousAction].reversible !==
metadata.reversible;

return (
<div key={action}>
{showSeparator ? <DropdownMenuSeparator /> : null}
<DropdownMenuItem
onClick={handleSelect(action)}
data-testid={`comment-report-action-${action}-${report.reportId}`}
              >
<span className="flex flex-col gap-0.5">
<span className="text-sm">{metadata.label}</span>
{isIrreversible ? (
<span className="text-[11px] text-muted-foreground">
This cannot be undone.
                    </span>
                  ) : null}
</span>
</DropdownMenuItem>
</div>
          );
        })}
</DropdownMenuContent>
</DropdownMenu>
  );
});
