/**
 * Vitest setup file for Story 3.1 DOM specs.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.B3 + TKT-3.1.C5 + TKT-3.1.D2.
 *
 * Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 * and configures a sane default for cleanup so each test starts with a
 * fresh DOM. cleanup is the testing-library default; we set it
 * explicitly for clarity.
 *
 * Also polyfills the native `value` setter on `HTMLInputElement` /
 * `HTMLTextAreaElement` / `HTMLSelectElement` because React 19 + jsdom
 * refuses to fire `change` events on inputs whose prototype has been
 * overridden (the "The given element does not have a value setter"
 * guard in `@testing-library/dom`). The polyfill re-installs the
 * native setter after React's override so `fireEvent.change` /
 * `userEvent.type` work as expected on controlled inputs — notably the
 * chip-style input that `<TagMultiSelect />` renders.
 */

import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

class TestResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= TestResizeObserver

// `window.matchMedia` is used by `use-mobile.ts` (SidebarProvider).
// jsdom does not implement it, so we polyfill it here.
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  })),
});

beforeAll(() => {
  const elements = [
    window.HTMLInputElement.prototype,
    window.HTMLTextAreaElement.prototype,
    window.HTMLSelectElement.prototype,
  ];
  for (const proto of elements) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    const nativeSetter = descriptor?.set;
    if (!nativeSetter) continue;
    Object.defineProperty(proto, 'value', {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set(value: string) {
        // Forward to the captured native setter so React's internal
        // "has the value changed?" tracker (`Object.is(prev, next)`)
        // sees the new value.
        nativeSetter.call(this, value);
      },
    });
  }
});

afterEach(() => {
  cleanup()
})