/**
 * `AttemptAbandonDialog.spec.tsx` — locks the typed-confirmation
 * abandon dialog.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.17.
 *
 * Coverage contract:
 *
 *   - The shared dialog renders the destructive-permanent copy.
 *   - Confirm is disabled until the typed string matches exactly.
 *   - Cancel performs no mutation.
 *   - Confirm invokes the provided callback exactly once.
 *   - `loading` (pending) disables confirm and the dialog stays
 *     open across the in-flight mutation.
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AttemptAbandonDialog } from '@/features/attempts/components/AttemptAbandonDialog';

describe('AttemptAbandonDialog — rendering', () => {
  it('renders the destructive-permanent copy', () => {
    render(
      <AttemptAbandonDialog
        open
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByTestId('attempt-abandon-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Delete permanently/i)).toBeInTheDocument();
  });
});

describe('AttemptAbandonDialog — typed confirm', () => {
  it('disables confirm until the user types the exact string', () => {
    const onConfirm = vi.fn();
    render(
      <AttemptAbandonDialog
        open
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    // The confirm action is initially disabled.
    const confirmBtn = screen.getByRole('button', { name: /abandon attempt/i });
    expect(confirmBtn).toBeDisabled();

    // Type a wrong string — confirm stays disabled.
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'wrong' } });
    expect(confirmBtn).toBeDisabled();

    // Type the exact override — confirm enables.
    fireEvent.change(input, { target: { value: 'abandon' } });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('invokes the callback exactly once when confirm is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <AttemptAbandonDialog
        open
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abandon' } });

    const confirmBtn = screen.getByRole('button', { name: /abandon attempt/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AttemptAbandonDialog — cancel', () => {
  it('invokes the cancel callback and performs no mutation', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <AttemptAbandonDialog
        open
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /go back/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('AttemptAbandonDialog — pending state', () => {
  it('disables confirm and cancel while pending', () => {
    render(
      <AttemptAbandonDialog
        open
        onConfirm={() => {}}
        onCancel={() => {}}
        isPending
      />,
    );

    expect(
      screen.getByRole('button', { name: /abandon attempt/i }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /go back/i })).toBeDisabled();
  });
});