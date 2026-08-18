

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { WithdrawDialog } from '@/features/tournaments/components/shared/WithdrawDialog';

vi.mock('@/components/ui/AlertDialog', () => ({
AlertDialog: ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => {
if (!open) return null;
return (
<div data-testid="alert-dialog">
{React.Children.map(children, (child) => {
if (React.isValidElement(child)) {
return React.cloneElement(child as React.ReactElement<{ onOpenChange?: (open: boolean) => void }>, { onOpenChange });
          }
return child;
        })}
</div>
    );
  },
AlertDialogContent: ({ children, onOpenChange, ...props }: { children: React.ReactNode; onOpenChange?: (open: boolean) => void }) => (
<div data-testid="alert-dialog-content" role="dialog" {...props}>
{React.Children.map(children, (child) => {
if (React.isValidElement(child)) {
return React.cloneElement(child as React.ReactElement<{ onOpenChange?: (open: boolean) => void }>, { onOpenChange });
        }
return child;
      })}
</div>
  ),
AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
<div data-testid="alert-dialog-header">{children}</div>
  ),
AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
<h2 data-testid="alert-dialog-title">{children}</h2>
  ),
AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
<p data-testid="alert-dialog-description">{children}</p>
  ),
AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
<div data-testid="alert-dialog-footer">{children}</div>
  ),
AlertDialogCancel: ({ children, onClick, disabled, ...props }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
<button
data-testid="withdraw-dialog-cancel"
onClick={onClick}
disabled={disabled}
type="button"
{...props}
    >
{children}
</button>
  ),
AlertDialogAction: ({ children }: { children: React.ReactNode }) => (
<div data-testid="alert-dialog-action">{children}</div>
  ),
}));

describe('WithdrawDialog', () => {
const defaultProps = {
open: true,
onConfirm: vi.fn(),
onCancel: vi.fn(),
  };

beforeEach(() => {
vi.clearAllMocks();
  });

describe('open/close behavior', () => {
it('renders nothing when open is false', () => {
render(<WithdrawDialog {...defaultProps} open={false} />);

expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
    });

it('renders dialog when open is true', () => {
render(<WithdrawDialog {...defaultProps} open={true} />);

expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
    });
  });

describe('content', () => {
it('renders "Withdraw from Tournament?" title', () => {
render(<WithdrawDialog {...defaultProps} />);

expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent('Withdraw from Tournament?');
    });

it('renders warning about irreversibility', () => {
render(<WithdrawDialog {...defaultProps} />);

const description = screen.getByTestId('alert-dialog-description');
expect(description).toHaveTextContent(/irreversible/i);
expect(description).toHaveTextContent(/permanent/i);
    });

it('displays tournament name when provided', () => {
render(<WithdrawDialog {...defaultProps} tournamentName="Summer Championship" />);

const description = screen.getByTestId('alert-dialog-description');
expect(description).toHaveTextContent('Summer Championship');
    });
  });

describe('actions', () => {
it('cancel button calls onCancel', () => {
render(<WithdrawDialog {...defaultProps} />);

const cancelButton = screen.getByTestId('withdraw-dialog-cancel');
fireEvent.click(cancelButton);

expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

it('confirm button calls onConfirm', () => {
render(<WithdrawDialog {...defaultProps} />);

const confirmButton = screen.getByTestId('withdraw-dialog-confirm');
fireEvent.click(confirmButton);

expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });
  });

describe('loading state', () => {
it('disables buttons when loading is true', () => {
render(<WithdrawDialog {...defaultProps} loading={true} />);

const cancelButton = screen.getByTestId('withdraw-dialog-cancel');
const confirmButton = screen.getByTestId('withdraw-dialog-confirm');

expect(cancelButton).toBeDisabled();
expect(confirmButton).toBeDisabled();
    });

it('buttons are enabled when loading is false', () => {
render(<WithdrawDialog {...defaultProps} loading={false} />);

const cancelButton = screen.getByTestId('withdraw-dialog-cancel');
const confirmButton = screen.getByTestId('withdraw-dialog-confirm');

expect(cancelButton).not.toBeDisabled();
expect(confirmButton).not.toBeDisabled();
    });
  });

describe('keyboard accessibility', () => {
it('has role="dialog" on content', () => {
render(<WithdrawDialog {...defaultProps} />);

const content = screen.getByTestId('alert-dialog-content');
expect(content).toHaveAttribute('role', 'dialog');
    });

it('calls onCancel when Escape key is pressed', () => {
render(<WithdrawDialog {...defaultProps} />);

const content = screen.getByTestId('alert-dialog-content');
fireEvent.keyDown(content, { key: 'Escape' });

expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

describe('ARIA attributes', () => {
it('has aria-labelledby pointing to title', () => {
render(<WithdrawDialog {...defaultProps} />);

const content = screen.getByTestId('alert-dialog-content');
const title = screen.getByTestId('alert-dialog-title');

expect(content).toHaveAttribute('aria-labelledby', title.id);
    });

it('has aria-describedby pointing to description', () => {
render(<WithdrawDialog {...defaultProps} />);

const content = screen.getByTestId('alert-dialog-content');
const description = screen.getByTestId('alert-dialog-description');

expect(content).toHaveAttribute('aria-describedby', description.id);
    });
  });
});
