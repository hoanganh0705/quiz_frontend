/**
 * Providers barrel.
 *
 * Re-exports every app-level provider so consumers (notably
 * `app/layout.tsx`) can import from a single path. The barrel
 * exists to prevent "where do I import SwrProvider from?" questions
 * and to keep the layout file's import list alphabetically short.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive.
 * Source ticket: TKT-3.2.A3 (acceptance criterion #5).
 *
 * Conventions:
 *   - Named re-exports (one `export { X }` per provider) so the bundler
 *     has a single named-export per provider (better tree-shaking and
 *     no name-collision risk). Mirrors the convention of
 *     `src/lib/api/index.ts`.
 *   - List is alphabetical by provider name. Add new providers below
 *     in alphabetical order.
 *
 * Usage:
 *   import { SwrProvider, ThemeProvider } from '@/providers'
 */

export { SwrProvider } from './SwrProvider'
export { ThemeProvider } from './ThemeProvider'
