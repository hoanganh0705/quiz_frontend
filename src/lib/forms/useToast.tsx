'use client';

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

export function useToast(): ToastContextValue {
return React.useContext(ToastContext);
}

export interface ToastProviderProps {
children: React.ReactNode;
}

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

export const DEFAULT_TOAST_DURATION_MS = 5000;

export interface ToastViewportProps {
toasts: readonly ToastEntry[];
onDismiss: (id: string) => void;
}

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
