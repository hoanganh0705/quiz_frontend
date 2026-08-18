'use client';

import Link from 'next/link';

import {
COPY_KEYS,
resolveCopy,
} from '@/features/auth/copy/registration-copy';

export default function CheckInboxPage() {
return (
<main
className='min-h-screen flex items-center justify-center bg-background px-6 py-12'
data-testid='check-inbox-page'
    >
<div className='w-full max-w-md space-y-6 text-center'>
<h1 className='text-3xl font-bold text-foreground'>
{resolveCopy(COPY_KEYS.submit.acknowledgement.title)}
</h1>
<p
className='text-sm text-muted-foreground'
data-testid='acknowledgement-body'
        >
{resolveCopy(COPY_KEYS.submit.acknowledgement.body)}
</p>
<p className='text-sm text-muted-foreground'>
{resolveCopy(COPY_KEYS.submit.acknowledgement.action)}
</p>
<div className='flex flex-col gap-2 pt-4'>
<Link
href='/resend-verification'
className='text-sm font-medium underline text-foreground hover:text-muted-foreground'
data-testid='resend-link'
          >
{resolveCopy(COPY_KEYS.submit.acknowledgement.resendLabel)}
</Link>
<Link
href='/login'
className='text-sm font-medium underline text-foreground hover:text-muted-foreground'
data-testid='login-link'
          >
{resolveCopy(COPY_KEYS.submit.acknowledgement.loginLabel)}
</Link>
</div>
</div>
</main>
  );
}
