

'use client';

import { memo, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';

export interface PublishReadinessCounterProps {

current: number;

required: number;

isReady: boolean;
}

const ProgressBar = memo(function ProgressBar({
progress,
isReady,
}: {
progress: number;
isReady: boolean;
}): React.ReactElement {
const [animatedProgress, setAnimatedProgress] = useState(0);

useEffect(() => {

const timeout = setTimeout(() => {
setAnimatedProgress(progress);
    }, 100);
return () => clearTimeout(timeout);
  }, [progress]);

return (
<div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
<div
className={cn(
'h-full transition-all duration-500 ease-out',
isReady ? 'bg-green-500' : 'bg-yellow-500',
        )}
style={{ width: `${Math.min(100, animatedProgress)}%` }}
role="progressbar"
aria-valuenow={Math.round(progress)}
aria-valuemin={0}
aria-valuemax={100}
      />
</div>
  );
});

export const PublishReadinessCounter = memo(function PublishReadinessCounter({
current,
required,
isReady,
}: PublishReadinessCounterProps): React.ReactElement {
const progress = Math.min(100, (current / required) * 100);

return (
<div
className={cn(
'flex items-center gap-4 rounded-lg border p-4 transition-colors',
isReady
? 'border-green-500/50 bg-green-500/10'
: 'border-yellow-500/50 bg-yellow-500/10',
      )}
data-testid="publish-readiness-counter"
role="status"
aria-live="polite"
    >
{/* Icon */}
{isReady ? (
<CheckCircle2 className="h-8 w-8 flex-shrink-0 text-green-500" />
      ) : (
<AlertCircle className="h-8 w-8 flex-shrink-0 text-yellow-600" />
      )}

{/* Content */}
<div className="flex-1 space-y-2">
<div className="flex items-baseline justify-between">
<span
className={cn(
'text-lg font-semibold',
isReady ? 'text-green-700' : 'text-yellow-800',
            )}
          >
{current} / {required} questions
          </span>
<span
className={cn(
'text-sm',
isReady ? 'text-green-600' : 'text-yellow-700',
            )}
          >
{isReady ? 'Ready to publish' : `${required - current} more needed`}
</span>
</div>
<ProgressBar progress={progress} isReady={isReady} />
</div>
</div>
  );
});
