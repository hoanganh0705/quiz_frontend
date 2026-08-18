'use client';

import * as React from 'react';

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
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import {
CONFIRM_COPY,
type ConfirmCopy,
type ConfirmKind,
} from './confirm-copy';

export type ConfirmDialogProps = {

open: boolean;

kind: ConfirmKind;

entityLabel?: string;

typedConfirmRequired?: boolean;

typedOverride?: string;

onConfirm: () => void;

onCancel: () => void;

confirmLabel?: string;
cancelLabel?: string;

loading?: boolean;

className?: string;

'data-testid'?: string;
};

function applyEntityToCopy(copy: ConfirmCopy, entityLabel: string | undefined): {
title: string;
body: string;
} {
if (!entityLabel) return { title: copy.title, body: copy.body };
return {
title: copy.title.replace(/<entity>/g, entityLabel),
body: copy.body.replace(/<entity>/g, entityLabel),
  };
}

export function ConfirmDialog(props: ConfirmDialogProps) {
const {
open,
kind,
entityLabel,
typedConfirmRequired,
typedOverride,
onConfirm,
onCancel,
confirmLabel,
cancelLabel,
loading,
className,
'data-testid': testId = 'confirm-dialog',
  } = props;

const copy = CONFIRM_COPY[kind];
const { title, body } = applyEntityToCopy(copy, entityLabel);

const typedString = typedOverride ?? copy.typedString;
const typedRequired =
typedConfirmRequired || typeof typedString === 'string' || kind === 'typed-confirm';

const [typedValue, setTypedValue] = React.useState('');

const confirmedRef = React.useRef(false);
const matchesTyped =
!typedRequired || (typedString != null && typedValue.trim() === typedString);

React.useEffect(() => {
if (!open) {
setTypedValue('');
confirmedRef.current = false;
    }
  }, [open]);

const handleTypedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
if (e.key === 'Enter' && matchesTyped && !loading) {
e.preventDefault();
handleConfirm();
    }
  };

const handleConfirm = React.useCallback(() => {
if (!matchesTyped || loading) return;
confirmedRef.current = true;
onConfirm();
  }, [matchesTyped, loading, onConfirm]);

return (
<AlertDialog
open={open}
onOpenChange={(next) => {
if (next) return;

if (!confirmedRef.current) onCancel();
      }}
    >
<AlertDialogContent
className={cn('sm:max-w-md', className)}
data-testid={testId}
      >
<AlertDialogHeader>
<AlertDialogTitle data-testid={`${testId}-title`}>{title}</AlertDialogTitle>
<AlertDialogDescription data-testid={`${testId}-body`}>
{body}
</AlertDialogDescription>
</AlertDialogHeader>

{typedRequired && typeof typedString === 'string' ? (
<div className="flex flex-col gap-2">
<label
htmlFor={`${testId}-typed-input`}
className="text-sm font-medium"
            >
Type <span className="font-mono">{typedString}</span> to confirm
            </label>
<Input
id={`${testId}-typed-input`}
data-testid={`${testId}-typed-input`}
value={typedValue}
onChange={(e) => setTypedValue(e.currentTarget.value)}
onKeyDown={handleTypedKeyDown}
autoComplete="off"
spellCheck={false}
autoFocus
disabled={loading}
            />
</div>
        ) : null}

<AlertDialogFooter>
<AlertDialogCancel data-testid={`${testId}-cancel`} disabled={loading}>
{cancelLabel ?? copy.cancelLabel}
</AlertDialogCancel>
<AlertDialogAction
asChild
onClick={(e) => {

if (!matchesTyped || loading) {
e.preventDefault();
return;
              }
handleConfirm();
            }}
          >
<Button
type="button"
disabled={!matchesTyped || !!loading}
aria-busy={loading || undefined}
data-testid={`${testId}-confirm`}
            >
{confirmLabel ?? copy.confirmLabel}
</Button>
</AlertDialogAction>
</AlertDialogFooter>
</AlertDialogContent>
</AlertDialog>
  );
}
