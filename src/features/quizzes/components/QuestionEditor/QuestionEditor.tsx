

'use client';

import { memo, useCallback, useEffect, useState } from 'react';

import type { ApiError } from '@/lib/api';
import type { QuizAuthorQuestionDto } from '@/features/quizzes/types/author-dtos';
import { logger } from '@/shared/log';

import { QuestionList } from './QuestionList';
import { SingleQuestionForm } from './SingleQuestionForm';
import { BulkQuestionForm } from './BulkQuestionForm';
import { PublishReadinessCounter } from './PublishReadinessCounter';

import {
assertAuthorQuestionDto,
AuthorDtoInvariantError,
} from '@/features/quizzes/invariants/dto-type-check';

type ViewMode = 'single' | 'bulk';

export interface QuestionEditorProps {

quizId: string;

versionId: string;

versionNumber: number;

questions: QuizAuthorQuestionDto[];

publishReadiness: {
current: number;
required: number;
isReady: boolean;
  };

isDraft: boolean;

onQuestionAdded: () => void;

onError: (error: { code: string; message: string }) => void;
}

export const QuestionEditor = memo(function QuestionEditor({
quizId,
versionId,
versionNumber,
questions,
publishReadiness,
isDraft,
onQuestionAdded,
onError,
}: QuestionEditorProps): React.ReactElement {

const [viewMode, setViewMode] = useState<ViewMode>('single');

const [singleFormKey, setSingleFormKey] = useState(0);
const [bulkFormKey, setBulkFormKey] = useState(0);

useEffect(() => {
try {
assertAuthorQuestionDto(questions);
    } catch (err) {

if (process.env.NODE_ENV === 'development') {
logger.warn('quizzes.question-editor', 'Author DTO invariant violation', err);
      }

onError({
code: 'GLOBAL_INTERNAL_ERROR',
message: err instanceof AuthorDtoInvariantError
? 'Data integrity check failed: expected author DTO with isCorrect field'
: 'Data integrity check failed',
      });
    }
  }, [questions, onError]);

const handleTabChange = useCallback((mode: ViewMode) => {
setViewMode(mode);
  }, []);

const handleQuestionAdded = useCallback(() => {
onQuestionAdded();

setSingleFormKey((k) => k + 1);
  }, [onQuestionAdded]);

const handleBulkQuestionsAdded = useCallback(() => {
onQuestionAdded();

setBulkFormKey((k) => k + 1);
  }, [onQuestionAdded]);

return (
<div className="space-y-8" data-testid="question-editor">
{/* Tab buttons */}
<div className="flex items-center gap-4 border-b border-border">
<button
type="button"
className={`px-4 py-2 text-sm font-medium transition-colors ${
viewMode === 'single'
? 'border-b-2 border-primary text-primary'
: 'text-muted-foreground hover:text-foreground'
}`}
onClick={() => handleTabChange('single')}
aria-selected={viewMode === 'single'}
role="tab"
        >
Add Single Question
        </button>
<button
type="button"
className={`px-4 py-2 text-sm font-medium transition-colors ${
viewMode === 'bulk'
? 'border-b-2 border-primary text-primary'
: 'text-muted-foreground hover:text-foreground'
}`}
onClick={() => handleTabChange('bulk')}
aria-selected={viewMode === 'bulk'}
role="tab"
        >
Bulk Add
        </button>
</div>

{/* Publish readiness counter */}
<PublishReadinessCounter
current={publishReadiness.current}
required={publishReadiness.required}
isReady={publishReadiness.isReady}
      />

{/* Question list */}
<QuestionList questions={questions} />

{/* Active form */}
<div role="tabpanel" data-testid={`question-form-${viewMode}`}>
{viewMode === 'single' ? (
<SingleQuestionForm
key={`single-${singleFormKey}`}
quizId={quizId}
versionId={versionId}
versionNumber={versionNumber}
questionCount={questions.length}
isDraft={isDraft}
onSuccess={handleQuestionAdded}
onError={onError}
          />
        ) : (
<BulkQuestionForm
key={`bulk-${bulkFormKey}`}
quizId={quizId}
versionId={versionId}
questionCount={questions.length}
isDraft={isDraft}
onSuccess={handleBulkQuestionsAdded}
onError={onError}
          />
        )}
</div>
</div>
  );
});
