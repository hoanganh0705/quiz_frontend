'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/forms/useToast';
import { use } from 'react';

import {
CollectionHeader,
CollectionQuizGrid,
CollectionAddQuizzesDialog,
CollectionRemoveConfirm,
CollectionAnalyticsPanel,
} from '@/features/bookmarks/components';
import {
useCollection,
useCollectionQuizzes,
useAddQuizzesToCollection,
useRemoveQuizzesFromCollection,
useCollectionAnalytics,
useCollectionInvalidation,
} from '@/features/bookmarks/hooks';
import type { CollectionQuiz, BulkOperationResult } from '@/features/bookmarks/types';

interface CollectionDetailPageProps {
params: Promise<{ id: string }>;
}

function CollectionDetailPageSkeleton() {
return (
<div className='space-y-6'>
{/* Header skeleton */}
<div className='animate-pulse space-y-4'>
<div className='h-4 w-32 bg-muted rounded' />
<div className='flex items-start gap-3'>
<div className='h-12 w-12 rounded-lg bg-muted' />
<div className='space-y-2'>
<div className='h-8 w-48 bg-muted rounded' />
<div className='h-4 w-64 bg-muted rounded' />
</div>
</div>
</div>

{/* Grid skeleton */}
<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
{Array.from({ length: 8 }).map((_, i) => (
<div key={i} className='rounded-lg border bg-card overflow-hidden'>
<div className='h-40 bg-muted' />
<div className='p-3 space-y-2'>
<div className='h-4 w-3/4 bg-muted rounded' />
<div className='h-3 w-1/2 bg-muted rounded' />
</div>
</div>
        ))}
</div>
</div>
  );
}

function CollectionNotFound() {
const router = useRouter();

return (
<div className='flex flex-col items-center justify-center py-16 text-center'>
<h1 className='text-2xl font-bold mb-2'>Collection not found</h1>
<p className='text-muted-foreground mb-4'>
This collection may have been deleted or you don&apos;t have access to it.
      </p>
<button
onClick={() => router.push('/bookmarks')}
className='text-primary hover:underline'
      >
Back to collections
      </button>
</div>
  );
}

export default function CollectionDetailPage({ params }: CollectionDetailPageProps) {
const { id } = use(params);
const router = useRouter();
const { push } = useToast();

const isValidId = useMemo(() => {

const uuidv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
return uuidv7Regex.test(id);
  }, [id]);

useEffect(() => {
if (!isValidId) {
router.replace('/bookmarks');
    }
  }, [isValidId, router]);

const { collection, isLoading: isCollectionLoading, error: collectionError } = useCollection(id);
const { quizzes, isLoading: isQuizzesLoading, hasMore, loadMore } = useCollectionQuizzes(id);
const { analytics, isLoading: isAnalyticsLoading, isEmpty: isAnalyticsEmpty, mutate: refreshAnalytics } = useCollectionAnalytics(id);

const { addQuizzes, results: addResults, isLoading: isAdding } = useAddQuizzesToCollection(id);
const { removeQuizzes, results: removeResults, isRemoving } = useRemoveQuizzesFromCollection(id);

const { invalidateQuizzes, invalidateAnalytics } = useCollectionInvalidation(id);

const [selectedQuizIds, setSelectedQuizIds] = useState<Set<string>>(new Set());

const [showAddDialog, setShowAddDialog] = useState(false);
const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

const isNotFound = !isCollectionLoading && !collection && !collectionError;

const handleAddSuccess = useCallback(
(quizIds: string[], addedCount: number) => {
push({
title: 'Quizzes added',
body: `Added ${addedCount} ${addedCount === 1 ? 'quiz' : 'quizzes'} to collection`,
durationMs: 5000,
      });
setShowAddDialog(false);

invalidateQuizzes();
invalidateAnalytics();
    },
[invalidateQuizzes, invalidateAnalytics, push],
  );

const handleAddQuizzes = useCallback(
async (quizIds: string[]): Promise<{ results: BulkOperationResult[] }> => {
const result = await addQuizzes(quizIds);
if (result.status === 'success') {
return { results: addResults };
      }
throw new Error('Failed to add quizzes');
    },
[addQuizzes, addResults],
  );

const handleRemoveConfirm = useCallback(async () => {
const quizIds = Array.from(selectedQuizIds);
await removeQuizzes(quizIds);
setSelectedQuizIds(new Set());
setShowRemoveConfirm(false);
push({
title: 'Quizzes removed',
body: `Removed ${quizIds.length} ${quizIds.length === 1 ? 'quiz' : 'quizzes'} from collection`,
durationMs: 5000,
    });
invalidateQuizzes();
invalidateAnalytics();
  }, [selectedQuizIds, removeQuizzes, invalidateQuizzes, invalidateAnalytics, push]);

const handleSelectionChange = useCallback((ids: Set<string>) => {
setSelectedQuizIds(ids);
  }, []);

const quizLabels = useMemo(() => {
const labels: Record<string, string> = {};
quizzes.forEach((q) => {
labels[q.quizId] = q.quizTitle;
    });
return labels;
  }, [quizzes]);

const isLoading = isCollectionLoading || isQuizzesLoading;

if (isNotFound) {
return <CollectionNotFound />;
  }

return (
<div className='min-h-screen text-foreground'>
<div className='max-w-7xl mx-auto px-4 py-6 space-y-8'>
{/* Header */}
<CollectionHeader
collection={collection}
isLoading={isCollectionLoading}
onAddQuizzes={() => setShowAddDialog(true)}
        />

{/* Quiz Grid */}
<CollectionQuizGrid
quizzes={quizzes}
selectedQuizIds={selectedQuizIds}
onSelectionChange={handleSelectionChange}
hasMore={hasMore}
isLoading={isQuizzesLoading}
onLoadMore={loadMore}
onRemoveSelected={() => setShowRemoveConfirm(true)}
removeLabel={`Remove selected (${selectedQuizIds.size})`}
onAddQuizzes={() => setShowAddDialog(true)}
        />

{/* Analytics Panel */}
<CollectionAnalyticsPanel
analytics={analytics}
isLoading={isAnalyticsLoading}
isEmpty={isAnalyticsEmpty}
onRefresh={refreshAnalytics}
        />
</div>

{/* Add Quizzes Dialog */}
<CollectionAddQuizzesDialog
open={showAddDialog}
onClose={() => setShowAddDialog(false)}
onSuccess={handleAddSuccess}
onAddQuizzes={handleAddQuizzes}
isAdding={isAdding}
      />

{/* Remove Confirm Dialog */}
{collection && (
<CollectionRemoveConfirm
open={showRemoveConfirm}
collectionName={collection.name}
quizIds={Array.from(selectedQuizIds)}
quizLabels={quizLabels}
onConfirm={handleRemoveConfirm}
onClose={() => setShowRemoveConfirm(false)}
isRemoving={isRemoving}
        />
      )}
</div>
  );
}
