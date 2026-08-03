'use client';

/**
 * `lib/forms/useToast.ts` — minimal toast surface for Phase 4 form atoms.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source ticket: TKT-4.2.C1.
 *
 * The Phase 4 project does not depend on a third-party toast library
 * (e.g. `sonner`, `react-hot-toast`). To honour the master-plan
 * contract that calls for "toast placement" — `toast: 'inline' | 'top'
 * | 'silent'` on `USER_COPY` entries — this module implements the
 * minimum a form atom needs to render a top-of-page toast.
 *
 * The surface is intentionally tiny:
 *
 *   - A top-level `<ToastViewport />` that the app mounts once near
 *     the root (it portals to `document.body`).
 *   - A `useToast()` hook returning a `push(toast)` function that
 *     adds a toast to the viewport.
 *   - Auto-dismiss after a configurable `durationMs` (default
 *     5 s, matching the master-plan rule for short transient
 *     feedback).
 *
 * The atom consumers (`<FormErrorBanner />`, TKT-4.2.C1) call
 * `push()` when the `USER_COPY` entry's `toast` field is `'top'`.
 * The banner itself remains the `'inline'` surface.
 *
 * ## Architecture notes
 *
 *   - The viewport is a React context (`ToastContext`). A
 *     `ToastProvider` owns the toast list; the hook reads the
 *     context. If the form is mounted outside a `<ToastProvider>`,
 *     `push()` is a no-op (defensive fallback so the banner does
 *     not throw in tests / SSR edge cases).
 *   - The viewport is wrapped in a portal so its position is
 *     independent of the form's layout (fixed top-right).
 *   - The `'silent'` placement intentionally produces no UI; the
 *     banner is never rendered (the consumer branch is upstream).
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { cn } from '@/shared/utils/merge-class-names';

export interface ToastEntry {
  id: string;
  title: string;
  body: string;
  durationMs: number;
}

export interface ToastContextValue {
  push: (entry: Omit<ToastEntry, 'id'>) => string;
  dismiss: (id: string) => void;
}

const NOOP_CONTEXT: ToastContextValue = {
  push: () => '',
  dismiss: () => undefined,
};

const ToastContext = React.createContext<ToastContextValue>(NOOP_CONTEXT);

/**
 * Read the toast context. If the consumer is mounted outside a
 * `<ToastProvider>`, the returned `push` / `dismiss` are no-ops.
 * This makes the toast surface optional; a form atom that calls
 * `push()` will not throw if the app has not installed a viewport.
 */
export function useToast(): ToastContextValue {
  return React.useContext(ToastContext);
}

export interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * `<ToastProvider />` — owns the toast list and renders the viewport.
 * Mount this once near the app root (e.g. inside the layout that
 * hosts `<FormErrorBanner />`'s parents).
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastEntry[]>([]);
  const timersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const dismiss = React.useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (entry: Omit<ToastEntry, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      setToasts((prev) => [...prev, { ...entry, id }]);
      const timer = setTimeout(() => {
        dismiss(id);
      }, entry.durationMs);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  // Clear timers on unmount.
  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({ push, dismiss }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/**
 * Default toast duration. The master plan doesn't pin a value but
 * 5 s is the upper bound of the form's "transient feedback" window
 * (the unsaved-changes guard also uses 5 s).
 */
export const DEFAULT_TOAST_DURATION_MS = 5000;

export interface ToastViewportProps {
  toasts: readonly ToastEntry[];
  onDismiss: (id: string) => void;
}

/**
 * The fixed-position viewport that renders the active toasts. The
 * viewport is portal-mounted to `document.body` so it sits above
 * all forms regardless of overflow:hidden, transform, etc.
 */
function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className='fixed top-4 right-4 z-50 flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]'
      data-testid='toast-viewport'
      role='region'
      aria-label='Notifications'
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} entry={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

interface ToastCardProps {
  entry: ToastEntry;
  onDismiss: (id: string) => void;
}

function ToastCard({ entry, onDismiss }: ToastCardProps) {
  return (
    <div
      role='alert'
      data-testid={`toast-${entry.id}`}
      className={cn(
        'flex items-start gap-2 rounded-md border bg-background text-foreground shadow-lg',
        'p-3 pr-2'
      )}
    >
      <div className='flex-1 space-y-1'>
        <p className='text-sm font-semibold leading-none'>{entry.title}</p>
        <p className='text-xs text-muted-foreground'>{entry.body}</p>
      </div>
      <button
        type='button'
        aria-label='Dismiss notification'
        data-testid={`toast-dismiss-${entry.id}`}
        className='text-muted-foreground hover:text-foreground'
        onClick={() => onDismiss(entry.id)}
      >
        <X className='h-4 w-4' aria-hidden='true' />
      </button>
    </div>
  );
}
