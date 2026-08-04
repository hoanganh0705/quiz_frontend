'use client';

/**
 * `AttemptHeader` — attempt runner header.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.16.
 *
 * ## What this component owns
 *
 *   - Renders the player-safe quiz title and the current runner
 *     status context.
 *   - Exposes the explicit "Abandon attempt" entry action which
 *     triggers the `onAbandon` callback; the component never
 *     mutates directly.
 *   - Disables the abandon action during `starting`, `submitting`,
 *     `abandoning`, `completing` transitions where required.
 *
 * ## What this component does NOT own
 *
 *   - No confirmation or mutation logic — the parent (AttemptRunner)
 *     is responsible for the dialog and the mutation hook.
 *   - No completion / score / pass controls.
 *   - No service / SWR / store / router imports.
 */

import * as React from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';

import type { AttemptRunnerStatus } from '@/features/attempts/types/attempt-runner.types';

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptHeaderProps {
  /** Player-safe quiz title. */
  title: string;
  /** Current runner status. */
  status: AttemptRunnerStatus;
  /**
   * Fired when the user clicks the Abandon action. Never fires while
   * the action is disabled.
   */
  onAbandon: () => void;
  /** Optional className for the header root. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptHeader(
  props: AttemptHeaderProps,
): React.ReactElement {
  const { title, status, onAbandon, className } = props;

  // Disable the Abandon action during transient mutations.
  const transient = status === 'starting' || status === 'submitting'
    || status === 'abandoning' || status === 'completing';

  return (
    <header
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      data-testid="attempt-header"
    >
      <div className="min-w-0">
        <h2 className="truncate text-lg font-semibold" data-testid="attempt-header-title">
          {title}
        </h2>
        <p
          className="text-xs text-muted-foreground"
          data-testid="attempt-header-status"
        >
          {describeStatus(status)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={transient || status === 'abandoned'}
          onClick={onAbandon}
          data-testid="attempt-header-abandon"
          aria-label="Abandon attempt"
        >
          Abandon attempt
        </Button>
      </div>
    </header>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function describeStatus(status: AttemptRunnerStatus): string {
  switch (status) {
    case 'idle':
      return 'Ready to start';
    case 'starting':
      return 'Starting attempt…';
    case 'in_progress':
      return 'In progress';
    case 'submitting':
      return 'Submitting answer…';
    case 'abandoning':
      return 'Abandoning attempt…';
    case 'completing':
      return 'Completing attempt…';
    case 'completed':
      return 'Completed';
    case 'abandoned':
      return 'Abandoned';
    case 'error':
      return 'Something went wrong';
  }
}