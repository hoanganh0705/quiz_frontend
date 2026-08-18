'use client';

import * as React from 'react';
import { AlertCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';
import { useToast, DEFAULT_TOAST_DURATION_MS } from '@/lib/forms/useToast';

export interface FormErrorBannerProps {

lastError:
| {
title: string;
body: string;
toast?: 'inline' | 'top' | 'silent';
code: string;
      }
    | null;

onDismiss: () => void;

className?: string;

testId?: string;
}

export function FormErrorBanner({
lastError,
onDismiss,
className,
testId = 'form-error-banner',
}: FormErrorBannerProps): React.ReactElement | null {
const toast = useToast();
const lastPushedCodeRef = React.useRef<string | null>(null);

React.useEffect(() => {
if (!lastError || lastError.toast !== 'top') {
lastPushedCodeRef.current = null;
return;
    }
if (lastPushedCodeRef.current === lastError.code) return;
lastPushedCodeRef.current = lastError.code;
toast.push({
title: lastError.title,
body: lastError.body,
durationMs: DEFAULT_TOAST_DURATION_MS,
    });
  }, [lastError, toast]);

if (!lastError || lastError.toast === 'silent') {
return null;
  }

return (
<div
role='alert'
aria-live='assertive'
data-testid={testId}
data-form-error-banner-code={lastError.code}
className={cn(
'flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive',
className
      )}
    >
<AlertCircle
className='h-4 w-4 mt-0.5 shrink-0'
aria-hidden='true'
      />
<div className='flex-1 space-y-1'>
<p className='font-semibold leading-none' data-testid={`${testId}-title`}>
{lastError.title}
</p>
<p className='text-xs text-destructive/90' data-testid={`${testId}-body`}>
{lastError.body}
</p>
</div>
<Button
type='button'
variant='ghost'
size='icon'
aria-label='Dismiss error'
onClick={onDismiss}
className='h-6 w-6 text-destructive hover:bg-destructive/20'
data-testid={`${testId}-dismiss`}
      >
<X className='h-4 w-4' aria-hidden='true' />
</Button>
</div>
  );
}
