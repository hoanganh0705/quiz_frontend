'use client';

import * as React from 'react';
import {
useController,
type FieldValues,
type Path,
} from 'react-hook-form';
import type { z } from 'zod';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { cn } from '@/shared/utils/merge-class-names';

export interface TextFieldProps<T extends z.ZodType<FieldValues, any, any>> {

name: Path<z.infer<T>>;

label: string;

description?: string;

placeholder?: string;

type?: 'text' | 'url' | 'email' | 'password' | 'tel' | 'search';

disabled?: boolean;

required?: boolean;

className?: string;

testId?: string;
}

export function TextField<T extends z.ZodType<FieldValues, any, any>>(
props: TextFieldProps<T>
): React.ReactElement {
const {
name,
label,
description,
placeholder,
type = 'text',
disabled,
required,
className,
testId,
  } = props;

const { field, fieldState, formState } = useController({ name });

const inputDisabled =
disabled === true ? true : disabled === false ? false : formState.isSubmitting;

const errorMessage = fieldState.error?.message;
const inputId = React.useId();

return (
<div className={cn('space-y-2', className)} data-testid={`text-field-${name}`}>
<Label htmlFor={inputId}>
{label}
{required ? (
<span aria-hidden='true' className='text-destructive'>
*
          </span>
        ) : null}
</Label>
{description ? (
<p className='text-xs text-muted-foreground'>{description}</p>
      ) : null}
<Input
id={inputId}
type={type}
placeholder={placeholder}
disabled={inputDisabled}
value={(field.value as string | undefined) ?? ''}
onChange={(event) => {
field.onChange(event);
        }}
onBlur={field.onBlur}
ref={field.ref}
aria-invalid={!!errorMessage}
data-testid={testId}
      />
{errorMessage ? (
<p className='text-xs text-destructive' role='alert'>
{errorMessage}
</p>
      ) : null}
</div>
  );
}