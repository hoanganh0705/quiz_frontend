

'use client';

import { memo } from 'react';

export interface QuizVersionTabsProps {

activeTab: 'drafts' | 'published';

onTabChange: (tab: 'drafts' | 'published') => void;

draftCount: number;

publishedCount: number;

className?: string;
}

export const QuizVersionTabs = memo(function QuizVersionTabs({
activeTab,
onTabChange,
draftCount,
publishedCount,
className,
}: QuizVersionTabsProps): React.ReactElement {
const tabs = [
{ id: 'drafts' as const, label: 'Drafts', count: draftCount },
{ id: 'published' as const, label: 'Published', count: publishedCount },
  ];

return (
<div
role="tablist"
aria-label="Quiz versions"
className={`flex items-center gap-1 border-b border-border ${className ?? ''}`}
data-testid="quiz-version-tabs"
    >
{tabs.map((tab) => (
<button
key={tab.id}
role="tab"
type="button"
aria-selected={activeTab === tab.id}
data-state={activeTab === tab.id ? 'active' : 'inactive'}
onClick={() => onTabChange(tab.id)}
className={`
            relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium
            transition-colors hover:text-foreground
            ${activeTab === tab.id
? 'text-foreground'
: 'text-muted-foreground'
}
          `}
data-testid={`tab-${tab.id}`}
        >
{tab.label}
<span
className={`
              inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs
              ${activeTab === tab.id
? 'bg-primary/10 text-primary'
: 'bg-muted text-muted-foreground'
}
            `}
data-testid={`${tab.id}-count`}
          >
{tab.count}
</span>

{/* Active indicator */}
{activeTab === tab.id && (
<span
className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
data-testid={`tab-${tab.id}-indicator`}
            />
          )}
</button>
      ))}
</div>
  );
});
