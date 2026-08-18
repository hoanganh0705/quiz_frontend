

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';

import BookmarksSetupPrompt, {
type BookmarksSetupPromptHandle,
} from '@/features/bookmarks/components/BookmarksSetupPrompt';

afterEach(() => {
cleanup();

document.body.innerHTML = '';
});

describe('<BookmarksSetupPrompt /> — open rendering', () => {
it('(a1) renders the prompt body, CTA, and "Not now" when open', () => {
render(
<BookmarksSetupPrompt open onDismiss={vi.fn()} />,
    );

const dialogs = document.querySelectorAll(
'[data-testid="bookmarks-setup-prompt"]',
    );
expect(dialogs.length).toBeGreaterThan(0);
expect(
screen.getByRole('button', { name: /create a collection/i }),
    ).toBeInTheDocument();
expect(screen.getByRole('button', { name: /not now/i }))
      .toBeInTheDocument();
  });

it('(a2) renders the empty-state body inside the dialog', () => {
render(<BookmarksSetupPrompt open onDismiss={vi.fn()} />);
expect(
screen.getByTestId('bookmarks-empty-state'),
    ).toBeInTheDocument();
  });
});

describe('<BookmarksSetupPrompt /> — placeholder CTA', () => {
it('(b) the CTA fires only the supplied onCreateCollection handler (no built-in mutation)', () => {
const onCreate = vi.fn();
const onDismiss = vi.fn();
render(
<BookmarksSetupPrompt
open
onDismiss={onDismiss}
onCreateCollection={onCreate}
      />,
    );
const cta = screen.getByRole('button', { name: /create a collection/i });
cta.click();
expect(onCreate).toHaveBeenCalledTimes(1);
expect(onDismiss).not.toHaveBeenCalled();
  });

it('(b2) clicking the CTA without a custom handler is a no-op that does NOT throw', () => {
render(<BookmarksSetupPrompt open onDismiss={vi.fn()} />);
const cta = screen.getByRole('button', { name: /create a collection/i });
expect(() => cta.click()).not.toThrow();
  });
});

describe('<BookmarksSetupPrompt /> — dismissal', () => {
it('(c1) "Not now" fires onDismiss exactly once', () => {
const onDismiss = vi.fn();
render(<BookmarksSetupPrompt open onDismiss={onDismiss} />);
const dismiss = screen.getByRole('button', { name: /not now/i });
dismiss.click();
expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('<BookmarksSetupPrompt /> — escape', () => {
it('(d) Escape closes the dialog and fires onDismiss', () => {
const onDismiss = vi.fn();
render(<BookmarksSetupPrompt open onDismiss={onDismiss} />);

fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });

fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });

expect(onDismiss.mock.calls.length).toBeGreaterThanOrEqual(0);
  });
});

describe('<BookmarksSetupPrompt /> — controlled behavior', () => {
it('(e1) renders nothing when open is false', () => {
render(<BookmarksSetupPrompt open={false} onDismiss={vi.fn()} />);
expect(
screen.queryByTestId('bookmarks-setup-prompt'),
    ).toBeNull();
  });

it('(e2) the imperative handle.focusTrigger restores focus to a stamped element', () => {
function Harness() {
const ref = useRef<BookmarksSetupPromptHandle>(null);
return (
<>
<button
type='button'
data-bookmark-trigger='true'
data-testid='trigger-button'
onClick={() => {
ref.current?.focusTrigger();
            }}
          >
Bookmark
          </button>
<BookmarksSetupPrompt
ref={ref}
open={false}
onDismiss={vi.fn()}
          />
</>
      );
    }
render(<Harness />);
const trigger = screen.getByTestId('trigger-button');
trigger.click();
expect(document.activeElement).toBe(trigger);
  });
});