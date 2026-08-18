'use client';

import type { ApiError } from '@/lib/api';

import { ErrorState } from '@/components/ui/loading-states/ErrorState';

export interface CategoryAdminErrorStateProps {

error: ApiError;

onRetry: () => void;
}

export function CategoryAdminErrorState({
error,
onRetry,
}: CategoryAdminErrorStateProps) {
return (
<div className='space-y-4'>
<ErrorState
title='Failed to load categories'
message={error.detail || 'An unexpected error occurred. Please try again.'}
onRetry={onRetry}
retryText='Try Again'
variant='server'
      />
</div>
  );
}