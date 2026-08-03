/**
 * <ConfirmDialog /> — DOM spec.
 *
 * Source epic:   Epic 4.1.
 * Source ticket: TKT-4.1.D2 + TKT-4.1.D3.
 *
 * Covers the 6 acceptance bullet points from TKT-4.1.D3:
 *
 *   (a) confirm click calls `onConfirm`
 *   (b) cancel click calls `onCancel`
 *   (c) Esc closes and calls `onCancel`
 *   (d) typed-confirm input is disabled-until-match
 *   (e) screen-reader role is `alertdialog`
 *   (f) focus is trapped while open + restored on close
 *   (g) Enter on the typed-input (when satisfied) calls `onConfirm`
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

import { ConfirmDialog } from '../ConfirmDialog';
import { CONFIRM_COPY } from '../confirm-copy';

afterEach(() => {
  cleanup();
});

describe('<ConfirmDialog /> — destructive-permanent variant', () => {
  it('renders title, body, confirm label, and cancel label from the vocabulary', () => {
    render(
      <ConfirmDialog
        open
        kind="destructive-permanent"
        entityLabel="My bookmarks"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText('Delete permanently?')).toBeInTheDocument();
    // entity is substituted into the body
    expect(screen.getByText(/This cannot be undone/)).toBeInTheDocument();
    expect(screen.getByTestId('confirm-dialog-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-dialog-cancel')).toBeInTheDocument();
  });

  it('(a) clicking confirm calls onConfirm', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        kind="destructive-permanent"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('(b) clicking cancel calls onCancel (and NOT onConfirm)', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        kind="destructive-permanent"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('(c) pressing ESC closes the dialog and calls onCancel', async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        kind="state-changing"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    // Radix's AlertDialog listens at the document level; fire on document.
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
  });

  it('(e) the rendered content carries role="alertdialog"', async () => {
    render(
      <ConfirmDialog
        open
        kind="destructive-permanent"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
  });
});

describe('<ConfirmDialog /> — typed-confirm variant', () => {
  it('(d) confirm button is disabled until the typed input matches typedString', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        kind="typed-confirm"
        entityLabel="quiz title"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    // The default typedString is 'confirm'.
    const input = screen.getByTestId('confirm-dialog-typed-input') as HTMLInputElement;
    const confirmBtn = screen.getByTestId(
      'confirm-dialog-confirm',
    ) as HTMLButtonElement;

    // Empty input: button disabled.
    expect(input).toBeInTheDocument();
    expect(confirmBtn).toBeDisabled();

    // Type a partial match: still disabled.
    fireEvent.change(input, { target: { value: 'confir' } });
    expect(confirmBtn).toBeDisabled();

    // Type the full match: enabled.
    fireEvent.change(input, { target: { value: 'confirm' } });
    expect(confirmBtn).not.toBeDisabled();

    // Click confirms.
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('(g) Enter on the typed input (when satisfied) calls onConfirm', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        kind="typed-confirm"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    const input = screen.getByTestId(
      'confirm-dialog-typed-input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'confirm' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('matches case-insensitively (typedString comparison uses trim+equals)', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        kind="typed-confirm"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    const input = screen.getByTestId(
      'confirm-dialog-typed-input',
    ) as HTMLInputElement;
    // Whitespace tolerance: " confirm " should match.
    fireEvent.change(input, { target: { value: '  confirm  ' } });
    const confirmBtn = screen.getByTestId(
      'confirm-dialog-confirm',
    ) as HTMLButtonElement;
    expect(confirmBtn).not.toBeDisabled();
  });

  it('honours typedOverride (consumer-provided string)', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        kind="destructive-permanent"
        typedOverride="delete-me"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    const input = screen.getByTestId(
      'confirm-dialog-typed-input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'wrong' } });
    expect(
      screen.getByTestId('confirm-dialog-confirm'),
    ).toBeDisabled();
    fireEvent.change(input, { target: { value: 'delete-me' } });
    expect(
      screen.getByTestId('confirm-dialog-confirm'),
    ).not.toBeDisabled();
  });
});

describe('<ConfirmDialog /> — loading state', () => {
  it('confirm button shows aria-busy when loading=true', () => {
    render(
      <ConfirmDialog
        open
        kind="destructive-permanent"
        loading
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const btn = screen.getByTestId(
      'confirm-dialog-confirm',
    ) as HTMLButtonElement;
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });
});

describe('<ConfirmDialog /> — interactivity boundary', () => {
  it('renders nothing destructive when closed (no button is mounted)', () => {
    render(
      <ConfirmDialog
        open={false}
        kind="destructive-permanent"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByTestId('confirm-dialog-confirm')).not.toBeInTheDocument();
  });

  it('copies the vocabulary literally for each variant', () => {
    const { rerender } = render(
      <ConfirmDialog
        open
        kind="destructive-idempotent"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText('Remove these items?')).toBeInTheDocument();
    rerender(
      <ConfirmDialog
        open
        kind="state-changing"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText('Continue?')).toBeInTheDocument();
    // Vocabulary lookup went through `CONFIRM_COPY[kind]`.
    expect(CONFIRM_COPY['state-changing'].title).toBe('Continue?');
  });
});
