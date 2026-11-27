---
name: QuizHub
description: Play, Share, Earn — gamified social quiz platform
colors:
  arcade-violet: "oklch(0.52 0.20 270)"
  arcade-violet-hover: "oklch(0.46 0.20 270)"
  arcade-violet-dark: "oklch(0.50 0.20 270)"
  arcade-violet-dark-hover: "oklch(0.54 0.20 270)"
  cosmic-slate: "oklch(0.1363 0.0364 259.2)"
  cosmic-indigo: "oklch(0.2795 0.0368 260.03)"
  canvas-white: "oklch(1 0 0)"
  charcoal-fg: "oklch(0.2656 0 0)"
  text-white: "oklch(0.985 0 0)"
  muted-gray: "oklch(0.45 0 0)"
  arcade-emerald: "oklch(0.7 0.14 145)"
  arcade-amber: "oklch(0.7 0.13 80)"
  arcade-rose: "oklch(0.7 0.12 25)"
  border-hairline: "oklch(0.922 0 0)"
  border-dark: "oklch(0.5 0 0)"
typography:
  display:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.15
  headline:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.arcade-violet}"
    textColor: "{colors.text-white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.arcade-violet-hover}"
  button-secondary:
    backgroundColor: "{colors.cosmic-indigo}"
    textColor: "{colors.text-white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card-default:
    backgroundColor: "{colors.canvas-white}"
    textColor: "{colors.charcoal-fg}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: QuizHub

## Overview

**Creative North Star: "The Playful Arcade"**

QuizHub channels the kinetic excitement, tactile satisfaction, and rewarding momentum of an upscale modern arcade. Knowledge testing is elevated from a sterile chore into an engaging, celebratory tournament arena. The aesthetic balances vibrant gamification energy with clean structural clarity: high-contrast dark cosmic canvas or crisp daylight whites, accented by vivid arcade violet, glowing status lights, and instantly recognizable difficulty tokens.

The visual atmosphere is deliberately focused and celebratory. It treats time, score, and achievement as high-stakes, rewarding visual events while fiercely rejecting two extremes: dull enterprise monotony (no generic bureaucratic gray-on-gray forms or spreadsheet-like question lists) and childish toy clutter (no low-effort chaotic stickers, distracting animations, or unreadable novelty fonts).

Interactions emphasize floating ambient depth: clean cards lift off subtle cosmic foundations, action buttons glow with focused intensity on hover, and difficulty badges give instant cognitive orientation across catalog rails.

**Key Characteristics:**

- Kinetic, electric brand violet against deep cosmic indigo and crisp daylight neutrals.
- Floating ambient depth with subtle hairline borders and multi-layer soft shadows.
- Distinct semantic difficulty coding (Emerald, Amber, Rose) guiding user quiz choices.
- Dual-font typography pairing geometric humanism (Outfit) with high-legibility monospace figures (JetBrains Mono).
- Snappy, purposeful micro-interactions with graceful reduced-motion fallbacks.

## Colors

The palette pairs high-contrast canvas neutrals with a luminous electric violet brand core and instant-read semantic gaming accents.

### Primary

- **Arcade Violet** (`oklch(0.52 0.20 270)` light / `oklch(0.50 0.20 270)` dark): The energetic heartbeat of QuizHub. Reserved for primary calls-to-action, key active states, interactive focuses, and celebratory highlight moments while maintaining ≥ 4.5:1 WCAG AA contrast with white foreground text.
- **Arcade Violet Hover** (`oklch(0.46 0.20 270)` light / `oklch(0.54 0.20 270)` dark): Deepened press state in light mode and elevated luminosity state in dark mode for primary interactive elements.

### Secondary

- **Cosmic Indigo** (oklch(0.2795 0.0368 260.03)): Elevated surface container tone for dark-mode cards, secondary buttons, and active filter chips.
- **Cosmic Slate** (oklch(0.1363 0.0364 259.2)): Deep immersive ground for dark theme viewports, evoking a sleek tournament stadium.

### Neutral

- **Canvas White** (oklch(1 0 0)): Pristine, clean background for light mode viewports and card bodies.
- **Charcoal Foreground** (oklch(0.2656 0 0)): Primary high-contrast body text in light mode ensuring strict WCAG AA readability.
- **Text White** (oklch(0.985 0 0)): High-contrast text on dark surfaces and atop the Arcade Violet brand buttons.
- **Muted Gray** (oklch(0.45 0 0)): Secondary meta information, timestamps, question counts, and author captions.
- **Hairline Border** (oklch(0.922 0 0) / dark: oklch(0.5 0 0)): Subtle boundary definition for cards, inputs, and separators.

### Semantic Difficulty

- **Arcade Emerald** (oklch(0.7 0.14 145) / text: emerald-700): Easy difficulty level indicators and successful quiz completion signals.
- **Arcade Amber** (oklch(0.7 0.13 80) / text: amber-700): Medium difficulty badges and cautionary streak/time limits.
- **Arcade Rose** (oklch(0.7 0.12 25) / text: rose-700): Hard difficulty badges, destructive actions, and timeout warnings.

### Named Rules

**The Spotlight Accent Rule.** Arcade Violet is reserved for the primary interactive pathway and winning states; it covers less than 15% of any viewport to preserve its punch and authority.
**The Difficulty Triage Rule.** Easy, Medium, and Hard difficulty colors must never be swapped or replaced with brand violet; they are cognitive invariants across cards, filters, and question badges.

## Typography

**Display Font:** Outfit (fallback: system-ui, sans-serif)
**Body Font:** Outfit (fallback: system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (fallback: monospace)

**Character:** Outfit delivers geometric modernity with friendly, screen-optimized warmth, while JetBrains Mono anchors timers, coin values, rankings, and question indices with rock-solid numerical stability.

### Hierarchy

- **Display** (700 bold, 2.25rem / 36px, line-height 1.15): Hero statements, major quiz titles, tournament headlines, and victory banners.
- **Headline** (700 bold, 1.75rem / 28px, line-height 1.25): Section headers, modal titles, and dashboard rail titles.
- **Title** (600 semi-bold, 1.25rem / 20px, line-height 1.3): Quiz card titles, question prompts, and settings group headers.
- **Body** (400 regular / 500 medium, 0.875rem / 14px, line-height 1.5): Quiz descriptions, explanations, comment threads, and body copy (optimal measure 55–70ch).
- **Label** (500 medium, 0.75rem / 12px, JetBrains Mono, tracking 0.02em): Timers, countdowns, coin counters, difficulty pills, and question index markers (e.g., `Q 04/10`).

### Named Rules

**The Monospace Numeric Rule.** Any number that counts down, increments, represents virtual currency, or marks an index must render in JetBrains Mono (`font-mono`) to prevent tabular layout shifts.

## Layout

QuizHub follows a fluid, sidebar-anchored layout architecture with a fixed 4rem (`h-16`) AppHeader offset, a collapsible application sidebar (`SidebarInset`), and a top breadcrumb bar (`AppBreadcrumbs`). All standard shell pages share the **Daily Challenge Page Shell** baseline so left and right indentation is identical across every route:

- **Standard page container (`PAGE_CONTAINER_CLASS`):** Full-width fluid inside `SidebarInset` with responsive padding **`p-4 md:p-8 lg:p-12`** (`min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12` — 16px mobile, 32px tablet, 48px desktop). Do not apply ad-hoc outer `max-w-4xl`/`max-w-5xl`/`max-w-6xl`/`max-w-7xl mx-auto` caps on standard shell pages.
- **Breadcrumb bar (`PAGE_GUTTER_CLASS`):** `AppBreadcrumbs` uses the exact matching horizontal gutters (`w-full px-4 md:px-8 lg:px-12`) with no `max-w-*` centering, keeping the breadcrumb trail pixel-parallel with every page's left and right edges.
- **Loading & skeleton parity:** Route `loading.tsx` files and `ProtectedShell` loading states must use the exact same `PAGE_CONTAINER_CLASS` outer spacing for `CLS = 0`.
- **Intentional inner constraints:** Auth routes outside `LayoutShell` (centered `max-w-md` cards), focused quiz player trials (`max-w-3xl`), and deliberate inner visual focal blocks (such as the centered Top-3 podium stairs inside `/leaderboard` or `max-w-2xl` subtitle copy) may constrain inner width without breaking the page's outer gutter alignment.
- **Catalog & Discovery Rails:** Horizontal swipeable rails (`category-swiper`, `QuizRail`) with snapping alignment on mobile and multi-column grid wrap on desktop (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`).

### Named Rules

**The Unified Page Gutter Rule (Daily Challenge Base).** Every standard shell page and `AppBreadcrumbs` must share `px-4 md:px-8 lg:px-12` horizontal gutters (`p-4 md:p-8 lg:p-12` on page roots) so navigating between pages never shifts the left or right page margins.

Responsive breakpoints follow Tailwind defaults: `sm: 640px`, `md: 768px`, `lg: 960px`, `xl: 1280px`, `2xl: 1536px`.

## Elevation & Depth

Surfaces employ a floating ambient depth strategy. Rather than flat clipping or jarring heavy borders, containers float gently above the canvas with soft layered ambient shadows, reinforced by translucent frosted glass headers (`backdrop-blur-md`).

### Shadow Vocabulary

- **Card Rest** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): Standard resting card elevation paired with a 1px border.
- **Interactive Lift** (`box-shadow: 0 10px 25px -5px oklch(0.65 0.15 270 / 0.15), 0 8px 10px -6px oklch(0.65 0.15 270 / 0.1)`): Hover and active state for clickable quiz cards and hero CTA elements.
- **Floating Overlay** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2)`): Dropdowns, modals, dialogs, and popovers.

### Named Rules

**The Ambient Lift Rule.** Interactive cards must never remain static on hover; they subtly lift (-2px translateY) and emit a soft ambient glow to invite engagement.

## Shapes

QuizHub's form language relies on comfortable, rounded geometry reflecting its arcade inspiration:

- **Controls & Buttons:** Rounded medium (8px / `rounded-md`) for buttons, text inputs, selects, and dropdown items.
- **Cards & Dialogs:** Rounded extra-large (12px / `rounded-xl`) for quiz cards, modal dialogs, and section panels.
- **Chips, Pills & Avatars:** Rounded full (9999px / `rounded-full`) for user avatars, coin balance pills, and category tags.
- **Borders:** Crisp 1px hairline strokes (`border border-border`) grounding cards against the background and maintaining separation in dark mode.

## Components

### Buttons

- **Shape:** Rounded-md (8px radius), height 36px (h-9) default, 32px (h-8) small, 40px (h-10) large.
- **Primary:** Background Arcade Violet (`bg-default`), text White (`text-default-foreground`), shadow-xs. Hover shifts to `bg-default-hover` with translateY(-1px).
- **Secondary / Outline:** Border `border-input`, background transparent, hover `bg-accent text-accent-foreground`.
- **Focus:** 3px ring offset with `focus-visible:ring-ring/50`.

### Difficulty Badges & Chips

- **Shape:** Rounded-md (8px), padding `px-2 py-0.5`, text-xs font-medium.
- **Variants:**
  - Easy: Emerald tinted background (`bg-emerald-500/15 text-emerald-700 dark:text-emerald-300`).
  - Medium: Amber tinted background (`bg-amber-500/15 text-amber-700 dark:text-amber-300`).
  - Hard: Rose tinted background (`bg-rose-500/15 text-rose-700 dark:text-rose-300`).

### Quiz Cards

- **Corner Style:** Rounded-xl (12px radius) with overflow hidden.
- **Cover Media:** 16:9 or 192px fixed height image with difficulty badge and duration pill overlaid.
- **Body Padding:** 16px (`p-4`), holding truncated title, creator avatar/name, category badge, and rating/stats footer.
- **Interaction:** Hover triggers subtle scale and ambient glow lift.

### Inputs & Form Fields

- **Style:** Height 36px (`h-9`), rounded-md (`rounded-md`), border `border-input`, background transparent or subtle input fill.
- **Focus:** Transitioned ring with `focus-visible:border-default`. Selection highlight uses `selection:bg-brand/35`.

### Navigation & Header

- **AppHeader:** Fixed height 64px (`h-16`), border bottom `border-border`, sticky with `backdrop-blur-md` background. Holds sidebar toggle, search, notification bell, coin balance pill, and user profile avatar.

### Signature Component: CoinBalancePill

- **Form:** Rounded-md pill with hairline border, holding Lucide Coins icon and formatted balance (`JetBrains Mono`). Hover opens wallet summary dropdown.

## Do's and Don'ts

### Do:

- **Do** format all timers, question counts, and coin values in JetBrains Mono (`font-mono`).
- **Do** use strict semantic difficulty colors (Emerald, Amber, Rose) on quiz cards and filters.
- **Do** pair card elevation with a 1px border (`border-border`) so contrast is preserved across dark and light modes.
- **Do** keep button and control corner radii consistent at 8px (`rounded-md`) and cards at 12px (`rounded-xl`).
- **Do** honor `prefers-reduced-motion` by disabling decorative keyframe pulses and bounce animations.

### Don't:

- **Don't** use generic corporate gray-on-gray styling or clinical data spreadsheets for quiz experiences.
- **Don't** clutter screens with childish novelty stickers, unreadable cartoon fonts, or unprompted confetti.
- **Don't** use Arcade Violet as a general background fill; it is strictly an interactive and celebratory accent.
- **Don't** hardcode raw hex values in component styling; always reference semantic tokens (`bg-background`, `text-foreground`, `border-border`, `bg-default`).
