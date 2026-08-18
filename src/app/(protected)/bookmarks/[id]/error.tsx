'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/shared/log';

interface CollectionDetailErrorProps {
error: Error & {
digest?: string;
  };
reset: () => void;
}

export default function CollectionDetailError({ error, reset }: CollectionDetailErrorProps) {
useEffect(() => {

logger.error('app.bookmarks.collection-detail', 'Error', { error, digest: error.digest });
  }, [error]);

return (
<div className='min-h-screen text-foreground flex items-center justify-center'>
<div className='max-w-md text-center space-y-4 p-6'>
<div className='flex justify-center'>
<div className='h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center'>
<AlertTriangle className='h-8 w-8 text-destructive' aria-hidden='true' />
</div>
</div>

<h1 className='text-2xl font-bold'>Something went wrong</h1>

<p className='text-muted-foreground'>
We couldn&apos;t load this collection. Please try again.
        </p>

{process.env.NODE_ENV === 'development' && error.message && (
<details className='text-left'>
<summary className='cursor-pointer text-sm text-muted-foreground hover:text-foreground'>
Error details
            </summary>
<pre className='mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto'>
{error.message}
{error.digest && `\n\nDigest: ${error.digest}`}
</pre>
</details>
        )}

<Button onClick={reset} className='w-full'>
Try again
        </Button>
</div>
</div>
  );
}
