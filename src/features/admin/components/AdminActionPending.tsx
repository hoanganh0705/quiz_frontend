'use client';

import { Children, cloneElement, isValidElement } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { Loader2 } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';

export interface AdminActionPendingProps {
isPending: boolean;
children: ReactNode;
className?: string;
}

const INTERACTIVE_TAG_NAMES = new Set([
'button',
'a',
'input',
'select',
'textarea',
]);

function disableChild(child: ReactNode): ReactNode {
if (!isValidElement(child)) return child;
const el = child as ReactElement<{
type?: string;
'aria-disabled'?: boolean | string;
disabled?: boolean;
className?: string;
style?: CSSProperties;
  }>;
const typeName = typeof el.type === 'string' ? el.type.toLowerCase() : '';
if (!INTERACTIVE_TAG_NAMES.has(typeName)) return child;
const existing = el.props;
const isAlreadyDisabled = existing.disabled === true;
const nextClassName = cn(
existing.className,
'pointer-events-none opacity-60',
  );
return cloneElement(el, {
'aria-disabled': 'true',
disabled: true,
className: nextClassName,
...(isAlreadyDisabled ? {} : {}),
  } as Record<string, unknown>);
}

export function AdminActionPending({
isPending,
children,
className,
}: AdminActionPendingProps) {
const wrapped = isPending
? Children.map(children, disableChild)
: children;

return (
<div
aria-busy={isPending ? 'true' : 'false'}
data-testid="admin-action-pending-root"
data-pending={isPending ? 'true' : 'false'}
className={cn('relative', className)}
    >
{wrapped}
{isPending ? (
<div
aria-hidden="true"
data-testid="admin-action-pending-overlay"
className={cn(
'absolute inset-0 z-10 flex items-center justify-center',
'rounded-md bg-background/40 backdrop-blur-[1px]',
          )}
        >
<Loader2
className="h-5 w-5 animate-spin text-muted-foreground"
aria-hidden="true"
          />
</div>
      ) : null}
</div>
  );
}
