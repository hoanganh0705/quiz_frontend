

import { cn } from '@/shared/utils/merge-class-names';

export interface CommentDeletedPlaceholderProps {

text?: string;

className?: string;
}

export function CommentDeletedPlaceholder({
text = '[Comment deleted]',
className,
}: CommentDeletedPlaceholderProps) {
return (
<div
role='status'
data-testid='comment-deleted-placeholder'
className={cn(
'flex h-9 items-center text-sm italic text-muted-foreground',
className,
      )}
    >
<span aria-hidden>{text}</span>
<span className='sr-only'>This comment has been deleted by its author.</span>
</div>
  );
}