

import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

class TestResizeObserver implements ResizeObserver {
observe(): void {}
unobserve(): void {}
disconnect(): void {}
}

globalThis.ResizeObserver ??= TestResizeObserver

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

nativeSetter.call(this, value);
      },
    });
  }
});

afterEach(() => {
cleanup()
})