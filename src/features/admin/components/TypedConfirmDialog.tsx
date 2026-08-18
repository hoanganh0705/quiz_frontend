'use client';

import type { ReactNode } from 'react';
import React from 'react';

import { useId, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

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
import { Label } from '@/components/ui/Label';
import { ApiError } from '@/lib/api/core/ApiError';

import {
getIrreversibleConfirmString,
type IrreversibleAdminOperation,
} from '../admin-capabilities';
import { RequestIdBanner } from './RequestIdBanner';

export interface TypedConfirmDialogProps {
open: boolean;
operation: IrreversibleAdminOperation;
onConfirm: () => void | Promise<void>;
onCancel: () => void;
pending?: boolean;
previousError?: ApiError | null;

expectedConfirmString?: string;

children?: React.ReactNode;
}

export function TypedConfirmDialog({
open,
operation,
onConfirm,
onCancel,
pending = false,
previousError = null,
expectedConfirmString,
children,
}: TypedConfirmDialogProps) {
const [input, setInput] = useState('');
const inputId = useId();

const requiredString = useMemo(() => {
return expectedConfirmString ?? getIrreversibleConfirmString(operation);
  }, [expectedConfirmString, operation]);

const matches = input === requiredString;

const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
event.preventDefault();
if (!matches || pending) return;
void onConfirm();
    // We deliberately leave `input` populated for visual confirmation
    // until the parent closes the dialog. The parent re-renders with
    // `open={false}` after the mutation settles (success or failure).
  };

const handleCancel = () => {
if (pending) return;
setInput('');
onCancel();
  };

return (
<AlertDialog
open={open}
onOpenChange={(next) => {
if (!next) handleCancel();
      }}
    >
<AlertDialogContent
data-testid="typed-confirm-dialog-content"
data-operation={operation}
      >
<AlertDialogHeader>
<AlertDialogTitle>Confirm irreversible action</AlertDialogTitle>
<AlertDialogDescription>
This action cannot be undone. To proceed, type the
            confirmation phrase exactly as shown.
          </AlertDialogDescription>
</AlertDialogHeader>

{previousError ? <RequestIdBanner error={previousError} /> : null}

{children !== undefined ? (
<div data-testid="typed-confirm-dialog-children">{children}</div>
        ) : null}

<form onSubmit={handleSubmit} className="flex flex-col gap-3">
<div className="flex flex-col gap-2">
<Label htmlFor={inputId}>Confirmation phrase</Label>
<code
data-testid="typed-confirm-dialog-required-string"
className="rounded bg-muted px-2 py-1 text-sm font-mono"
            >
{requiredString ?? ''}
</code>
<Input
id={inputId}
name="typed-confirm"
autoComplete="off"
spellCheck={false}
data-testid="typed-confirm-dialog-input"
value={input}
onChange={(event) => setInput(event.target.value)}
disabled={pending}
aria-invalid={input.length > 0 && !matches ? 'true' : 'false'}
aria-describedby={`${inputId}-hint`}
placeholder="Type the confirmation phrase"
            />
<p
id={`${inputId}-hint`}
className="text-xs text-muted-foreground"
            >
Match is case-sensitive and whitespace-sensitive.
            </p>
</div>

<AlertDialogFooter className="mt-2">
<AlertDialogCancel
type="button"
disabled={pending}
data-testid="typed-confirm-dialog-cancel"
            >
Cancel
            </AlertDialogCancel>
<AlertDialogAction
type="submit"
disabled={!matches || pending}
data-testid="typed-confirm-dialog-confirm"
aria-disabled={!matches || pending}
            >
{pending ? 'Working…' : 'Confirm'}
</AlertDialogAction>
</AlertDialogFooter>
</form>
</AlertDialogContent>
</AlertDialog>
  );
}
