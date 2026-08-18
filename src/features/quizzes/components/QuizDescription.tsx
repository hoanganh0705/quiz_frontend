

'use client';

import { useId, useMemo, useState } from 'react';

import { cn } from '@/shared/utils/merge-class-names';

import {
type InlineSegment,
type MarkdownNode,
renderDescription,
splitInline,
} from '../lib/sanitize-description-markdown';

const SECTION = 'flex flex-col gap-3';
const HEADING_2 = 'text-lg font-semibold text-foreground';
const HEADING_3 = 'text-base font-semibold text-foreground';
const PARAGRAPH = 'text-sm leading-relaxed text-foreground';
const LIST = 'list-inside list-disc space-y-1 text-sm text-foreground';
const LIST_ORDERED = 'list-decimal';
const LINK = 'text-primary underline-offset-4 hover:underline';
const EXPANDER_BUTTON =
'inline-flex w-fit items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const PREVIEW_THRESHOLD = 300;

export interface QuizDescriptionProps {

description: string | null;
className?: string;
}

function renderInline(
text: string,
keyPrefix: string,
): React.ReactNode[] {
const segments = splitInline(text);
return segments.map((segment, index) => {
const key = `${keyPrefix}-${index}`;
if (segment.kind === 'link') {

return (
<a
key={key}
className={LINK}
href={segment.href}
rel='noopener noreferrer'
target='_blank'
        >
{segment.text}
</a>
      );
    }
return <span key={key}>{segment.text}</span>;
  });
}

function renderNode(
node: MarkdownNode,
index: number,
): React.ReactNode {
switch (node.type) {
case 'heading':
return node.level === 2 ? (
<h2 key={`h2-${index}`} className={HEADING_2}>
{renderInline(node.text, `h2-${index}`)}
</h2>
      ) : (
<h3 key={`h3-${index}`} className={HEADING_3}>
{renderInline(node.text, `h3-${index}`)}
</h3>
      );
case 'paragraph':
return (
<p key={`p-${index}`} className={PARAGRAPH}>
{renderInline(node.text, `p-${index}`)}
</p>
      );
case 'list':
return (
<ol
key={`l-${index}`}
className={cn(
LIST,
node.ordered ? LIST_ORDERED : 'list-disc',
          )}
        >
{node.items.map((item, itemIndex) => (
<li key={`l-${index}-${itemIndex}`}>
{renderInline(item, `l-${index}-${itemIndex}`)}
</li>
          ))}
</ol>
      );
default:
return null;
  }
}

export function QuizDescription({
description,
className,
}: QuizDescriptionProps) {

const hasContent =
typeof description === 'string' && description.trim().length > 0;
const sanitizedPreview = useMemo(() => {
if (!hasContent) return '';

return (description as string).slice(0, PREVIEW_THRESHOLD);
  }, [description, hasContent]);

const fullNodes = useMemo<MarkdownNode[]>(() => {
if (!hasContent) return [];
return renderDescription(description as string);
  }, [description, hasContent]);

const previewNodes = useMemo<MarkdownNode[]>(() => {
if (!hasContent) return [];
if ((description as string).length <= PREVIEW_THRESHOLD) {
return fullNodes;
    }
return renderDescription(sanitizedPreview);
  }, [description, hasContent, fullNodes, sanitizedPreview]);

const buttonId = useId();
const regionId = useId();

const [isExpanded, setIsExpanded] = useState<boolean>(false);

if (!hasContent) {
return null;
  }

const isLong = (description as string).length > PREVIEW_THRESHOLD;

return (
<section
className={cn(SECTION, className)}
data-testid='quiz-description'
data-expanded={isExpanded ? 'true' : 'false'}
data-long={isLong ? 'true' : 'false'}
aria-labelledby={buttonId}
    >
<div
id={regionId}
data-testid='quiz-description-body'
data-truncated={isLong && !isExpanded ? 'true' : 'false'}
      >
{(isLong && !isExpanded ? previewNodes : fullNodes).map((node, index) =>
renderNode(node, index),
        )}
</div>

{isLong ? (
<button
type='button'
id={buttonId}
aria-controls={regionId}
aria-expanded={isExpanded}
className={EXPANDER_BUTTON}
onClick={() => setIsExpanded((prev) => !prev)}
data-testid='quiz-description-toggle'
        >
{isExpanded ? 'Show less' : 'Read more'}
</button>
      ) : null}
</section>
  );
}

export type { InlineSegment };
