

'use client';

import { memo } from 'react';

import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { getConfirmKind } from '@/features/shared/phase4ConfirmCopyMap';

export interface PublishConfirmDialogProps {

open: boolean;

quizTitle?: string;

onConfirm: () => void;

onCancel: () => void;

loading?: boolean;

className?: string;
}

export const PublishConfirmDialog = memo(function PublishConfirmDialog({
open,
quizTitle,
onConfirm,
onCancel,
loading = false,
className,
}: PublishConfirmDialogProps) {

const _kind = getConfirmKind('quiz.publish');

const title = 'Publish this quiz?';

const body = quizTitle
? `Publishing "${quizTitle}" makes this version permanent and discoverable on /quizzes. You can still edit by creating a new draft version.`
: 'Publishing makes this version permanent and discoverable on /quizzes. You can still edit by creating a new draft version.';

return (
<AlertDialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
<AlertDialogContent className={className}>
<AlertDialogHeader>
<AlertDialogTitle>{title}</AlertDialogTitle>
<AlertDialogDescription>{body}</AlertDialogDescription>
</AlertDialogHeader>

<AlertDialogFooter>
<AlertDialogCancel onClick={onCancel} disabled={loading}>
Cancel
          </AlertDialogCancel>
<AlertDialogAction asChild onClick={onConfirm}>
<Button variant="default" disabled={loading}>
{loading ? 'Publishing...' : 'Publish'}
</Button>
</AlertDialogAction>
</AlertDialogFooter>
</AlertDialogContent>
</AlertDialog>
  );
});
