

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { FormErrorBanner } from '../FormErrorBanner';
import { ToastProvider } from '@/lib/forms/useToast';

const inlineError = {
title: 'Quiz not found',
body: 'Quiz was not found.',
toast: 'inline' as const,
code: 'QUIZ_NOT_FOUND',
};

const topError = {
title: 'Server error',
body: 'An unexpected error occurred.',
toast: 'top' as const,
code: 'GLOBAL_INTERNAL_ERROR',
};

const silentError = {
title: 'Silent',
body: 'Should not render.',
toast: 'silent' as const,
code: 'GLOBAL_UNKNOWN',
};

describe('<FormErrorBanner />', () => {
it('(a) renders nothing when lastError is null', () => {
const { container } = render(
<ToastProvider>
<FormErrorBanner lastError={null} onDismiss={() => undefined} />
</ToastProvider>
    );
expect(container.querySelector('[data-testid="form-error-banner"]')).toBeNull();
  });

it('(b) renders title + body inline when toast is "inline"', () => {
render(
<ToastProvider>
<FormErrorBanner lastError={inlineError} onDismiss={() => undefined} />
</ToastProvider>
    );
const banner = screen.getByTestId('form-error-banner');
expect(banner).toBeInTheDocument();
expect(screen.getByTestId('form-error-banner-title')).toHaveTextContent('Quiz not found');
expect(screen.getByTestId('form-error-banner-body')).toHaveTextContent('Quiz was not found.');
expect(screen.getByTestId('form-error-banner')).toHaveAttribute(
'data-form-error-banner-code',
'QUIZ_NOT_FOUND'
    );

expect(document.querySelector('[data-testid^="toast-toast-"]')).toBeNull();
  });

it('(c) renders the banner AND dispatches a top-of-page toast when toast is "top"', async () => {
render(
<ToastProvider>
<FormErrorBanner lastError={topError} onDismiss={() => undefined} />
</ToastProvider>
    );

const banner = screen.getByTestId('form-error-banner');
expect(banner).toBeInTheDocument();
expect(screen.getByTestId('form-error-banner-title')).toHaveTextContent('Server error');

const viewport = await screen.findByTestId('toast-viewport');
expect(viewport).toBeInTheDocument();
const toastNode = viewport.querySelector('[data-testid^="toast-toast-"]');
expect(toastNode).not.toBeNull();
expect(toastNode).toHaveTextContent('Server error');
  });

it('(d) renders nothing when toast is "silent"', () => {
const { container } = render(
<ToastProvider>
<FormErrorBanner lastError={silentError} onDismiss={() => undefined} />
</ToastProvider>
    );
expect(container.querySelector('[data-testid="form-error-banner"]')).toBeNull();

expect(document.querySelector('[data-testid^="toast-toast-"]')).toBeNull();
  });

it('(e) clicking the dismiss button calls onDismiss', () => {
const onDismiss = vi.fn();
render(
<ToastProvider>
<FormErrorBanner lastError={inlineError} onDismiss={onDismiss} />
</ToastProvider>
    );
fireEvent.click(screen.getByTestId('form-error-banner-dismiss'));
expect(onDismiss).toHaveBeenCalledTimes(1);
  });

it('(f) renders safely when no ToastProvider is mounted (no throw)', () => {

render(<FormErrorBanner lastError={inlineError} onDismiss={() => undefined} />);
expect(screen.getByTestId('form-error-banner')).toBeInTheDocument();
  });

it('does not re-dispatch the same toast on re-render', async () => {
const { rerender } = render(
<ToastProvider>
<FormErrorBanner lastError={topError} onDismiss={() => undefined} />
</ToastProvider>
    );

const viewport = await screen.findByTestId('toast-viewport');
expect(viewport.querySelectorAll('[data-testid^="toast-toast-"]').length).toBe(1);
rerender(
<ToastProvider>
<FormErrorBanner lastError={topError} onDismiss={() => undefined} />
</ToastProvider>
    );

const toasts = viewport.querySelectorAll('[data-testid^="toast-toast-"]');
expect(toasts.length).toBe(1);
  });
});