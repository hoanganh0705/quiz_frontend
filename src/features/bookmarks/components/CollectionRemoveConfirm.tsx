'use client';

import { useState, useCallback } from 'react';
import { ConfirmDialog } from '@/components/primitives';

interface CollectionRemoveConfirmProps {

open: boolean;

collectionName: string;

quizIds: string[];

quizLabels?: Record<string, string>;

onConfirm: () => Promise<void>;

onClose: () => void;

isRemoving?: boolean;
}

export default function CollectionRemoveConfirm({
open,
collectionName,
quizIds,
quizLabels = {},
onConfirm,
onClose,
isRemoving = false,
}: CollectionRemoveConfirmProps) {
const [isRemovingLocal, setIsRemovingLocal] = useState(false);

const handleConfirm = useCallback(async () => {
setIsRemovingLocal(true);
try {
await onConfirm();
    } finally {
setIsRemovingLocal(false);
    }
  }, [onConfirm]);

const MAX_PREVIEW = 5;
const visibleLabels = quizIds.slice(0, MAX_PREVIEW).map((id) => quizLabels[id] || `Quiz ${id.slice(0, 8)}...`);
const hiddenCount = quizIds.length - MAX_PREVIEW;

let entityLabel: string;
if (visibleLabels.length === 0) {
entityLabel = `${quizIds.length} quizzes`;
  } else if (hiddenCount > 0) {
entityLabel = `"${collectionName}" (${quizIds.length} quizzes: ${visibleLabels.join(', ')} and ${hiddenCount} more)`;
  } else {
entityLabel = `"${collectionName}" (${visibleLabels.join(', ')})`;
  }

const isRemovingFinal = isRemoving || isRemovingLocal;

return (
<ConfirmDialog
open={open}
kind='destructive-idempotent'
entityLabel={entityLabel}
typedOverride={collectionName}
onConfirm={handleConfirm}
onCancel={onClose}
loading={isRemovingFinal}
confirmLabel='Remove'
    />
  );
}
