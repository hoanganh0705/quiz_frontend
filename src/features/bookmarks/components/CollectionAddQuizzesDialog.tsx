'use client';

/**
 * `CollectionAddQuizzesDialog` — modal dialog for searching and bulk adding quizzes.
 *
 * Source epic:   Epic 4.7 — Collection detail + bulk add/remove + analytics.
 * Source ticket: EPIC-4.7-B3-3.
 *
 * ## What this component owns
 *
 *   - Search input for finding quizzes.
 *   - Selectable search results list.
 *   - Selection counter (X of 100 selected).
 *   - Submit with validation (max 100).
 *   - Loading state during submission.
 *   - BulkResultList for showing results.
 *   - Dialog remains open on partial failure.
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Search, X, Loader2 } from 'lucide-react';
import type { BulkOperationResult } from '@/features/bookmarks/types';
import BulkResultList from './BulkResultList';

interface SearchResult {
  quizId: string;
  quizTitle: string;
  quizSlug: string;
  quizImageUrl: string | null;
  isFeatured: boolean;
}

interface CollectionAddQuizzesDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback when dialog should close. */
  onClose: () => void;
  /** Callback when quizzes are successfully added. */
  onSuccess: (quizIds: string[], addedCount: number) => void;
  /** Callback to add quizzes (returns results). */
  onAddQuizzes: (quizIds: string[]) => Promise<{ results: BulkOperationResult[] }>;
  /** Whether the add operation is in progress. */
  isAdding?: boolean;
  /** Maximum quizzes that can be selected. */
  maxSelection?: number;
}

/**
 * CollectionAddQuizzesDialog component.
 *
 * Features:
 * - Search input for finding quizzes
 * - Selectable search results
 * - Selection counter (X of 100)
 * - Submit with validation
 * - BulkResultList for results
 * - Dialog stays open on partial failure
 */
export default function CollectionAddQuizzesDialog({
  open,
  onClose,
  onSuccess,
  onAddQuizzes,
  isAdding = false,
  maxSelection = 100,
}: CollectionAddQuizzesDialogProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Results state (for showing after submission)
  const [results, setResults] = useState<BulkOperationResult[] | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedIds(new Set());
        setResults(null);
        setShowResults(false);
        onClose();
      }
    },
    [onClose],
  );

  // Simulated search (in a real implementation, this would call the API)
  // For now, we'll use a placeholder that simulates search behavior
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      if (query.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);

      // TODO: Replace with actual API call to search quizzes
      // For now, simulate with a delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Placeholder results - in real implementation, this would be:
      // const response = await searchQuizzes(query);
      setSearchResults([]);
      setIsSearching(false);
    },
    [],
  );

  // Toggle selection
  const handleToggle = useCallback(
    (quizId: string) => {
      setResults(null);
      setShowResults(false);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(quizId)) {
          next.delete(quizId);
        } else if (next.size < maxSelection) {
          next.add(quizId);
        }
        return next;
      });
    },
    [maxSelection],
  );

  // Select all results
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setResults(null);
      setShowResults(false);
      if (checked) {
        const allIds = new Set(selectedIds);
        searchResults.forEach((r) => {
          if (allIds.size < maxSelection) {
            allIds.add(r.quizId);
          }
        });
        setSelectedIds(allIds);
      } else {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          searchResults.forEach((r) => next.delete(r.quizId));
          return next;
        });
      }
    },
    [searchResults, selectedIds, maxSelection],
  );

  // Submit
  const handleSubmit = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const quizIds = Array.from(selectedIds);
    try {
      const response = await onAddQuizzes(quizIds);
      setResults(response.results);
      setShowResults(true);

      const addedCount = response.results.filter((r) => r.status === 'success').length;
      if (addedCount > 0) {
        onSuccess(quizIds, addedCount);
      }
    } catch {
      // Error is handled by parent
    }
  }, [selectedIds, onAddQuizzes, onSuccess]);

  // Handle retry
  const handleRetry = useCallback(
    async (quizIds: string[]) => {
      const response = await onAddQuizzes(quizIds);
      setResults(response.results);

      const addedCount = response.results.filter((r) => r.status === 'success').length;
      if (addedCount > 0) {
        onSuccess(quizIds, addedCount);
      }
    },
    [onAddQuizzes, onSuccess],
  );

  // Handle dismiss result
  const handleDismissResult = useCallback((_index: number) => {
    // In a real implementation, this would remove the result from display
    // For now, we just acknowledge the dismiss
  }, []);

  // Can submit?
  const canSubmit = selectedIds.size > 0 && selectedIds.size <= maxSelection && !isAdding;

  // All selected state
  const allSelected = searchResults.length > 0 && searchResults.every((r) => selectedIds.has(r.quizId));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-lg max-h-[85vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Add quizzes to collection</DialogTitle>
          <DialogDescription>
            Search for quizzes and add them to this collection. You can select up to {maxSelection} quizzes at once.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-hidden space-y-4'>
          {/* Search input */}
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' aria-hidden='true' />
            <Input
              placeholder='Search quizzes...'
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className='pl-10 pr-10'
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                aria-label='Clear search'
              >
                <X className='h-4 w-4' aria-hidden='true' />
              </button>
            )}
          </div>

          {/* Results or bulk results */}
          {showResults && results ? (
            <BulkResultList
              results={results}
              onDismiss={handleDismissResult}
              onRetryFailed={handleRetry}
              isRetrying={isAdding}
            />
          ) : (
            <>
              {/* Selection counter */}
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>
                  {selectedIds.size} of {maxSelection} selected
                </span>
                {searchResults.length > 0 && (
                  <button
                    onClick={() => handleSelectAll(!allSelected)}
                    className='text-sm text-primary hover:underline'
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {/* Results list */}
              <ScrollArea className='flex-1 -mx-6 px-6'>
                {isSearching ? (
                  <div className='flex items-center justify-center py-8'>
                    <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' aria-hidden='true' />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className='space-y-2 py-2'>
                    {searchResults.map((result) => (
                      <div
                        key={result.quizId}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          selectedIds.has(result.quizId)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedIds.has(result.quizId)}
                          onCheckedChange={() => handleToggle(result.quizId)}
                          aria-label={`Select ${result.quizTitle}`}
                        />
                        <div className='flex-1 min-w-0'>
                          <p className='font-medium text-sm truncate'>{result.quizTitle}</p>
                        </div>
                        {result.isFeatured && (
                          <span className='text-xs bg-yellow-500 text-white px-2 py-0.5 rounded'>
                            Featured
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className='flex flex-col items-center justify-center py-8 text-center'>
                    <Search className='h-8 w-8 text-muted-foreground mb-2' aria-hidden='true' />
                    <p className='text-sm text-muted-foreground'>No quizzes found</p>
                    <p className='text-xs text-muted-foreground'>Try a different search term</p>
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center py-8 text-center'>
                    <Search className='h-8 w-8 text-muted-foreground mb-2' aria-hidden='true' />
                    <p className='text-sm text-muted-foreground'>Enter at least 2 characters to search</p>
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)} disabled={isAdding}>
            {showResults ? 'Close' : 'Cancel'}
          </Button>
          {!showResults && (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {isAdding ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' aria-hidden='true' />
                  Adding...
                </>
              ) : (
                `Add ${selectedIds.size} ${selectedIds.size === 1 ? 'quiz' : 'quizzes'}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
