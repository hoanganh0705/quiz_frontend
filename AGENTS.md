# QuizHub Frontend — Workspace Rules

## 1. Canonical Page Shell & Indentation Rule (Daily Challenge Base)

All standard pages rendered inside `LayoutShell` (`SidebarInset`) MUST share the exact same outer horizontal and vertical indentation as `/daily-challenge` (`src/app/(public)/daily-challenge/page.tsx`):

- **Shared Layout Constants** (`src/shared/layout/constants.ts`):
  - `PAGE_GUTTER_CLASS`: `"w-full px-4 md:px-8 lg:px-12"`
  - `PAGE_CONTAINER_CLASS`: `"min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12"`
- **No Ad-Hoc Outer `max-w-*` Wrappers**: Do NOT wrap standard shell pages, route `loading.tsx` skeletons, or `ProtectedShell` loading states in `max-w-4xl`, `max-w-5xl`, `max-w-6xl`, or `max-w-7xl mx-auto` with `px-4 sm:px-6 lg:px-8`. Every shell page MUST align flush to the `px-4 md:px-8 lg:px-12` left and right edges (16px mobile / 32px tablet / 48px desktop).
- **Breadcrumb Alignment Invariant**: `AppBreadcrumbs` (`src/shared/layout/components/AppBreadcrumbs.tsx`) MUST use `PAGE_GUTTER_CLASS` (`w-full px-4 md:px-8 lg:px-12`) with no `max-w-*` or `mx-auto`, keeping the breadcrumb trail pixel-parallel with every page's content edges across all viewports.
- **Standard Page Header & Rhythm**:
  - Open pages with a semantic `<header>` containing `<h1>` (`text-2xl md:text-3xl font-bold tracking-tight text-foreground`) and a concise subtitle (`text-sm sm:text-base text-muted-foreground`).
  - Use `space-y-6` or `space-y-8` for vertical section cadence, and mirror the exact outer container in the route's `loading.tsx` to prevent layout shift (`CLS = 0`).
- **Allowed Exceptions**:
  - Auth routes outside `LayoutShell` (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/resend-verification`, `/register/check-inbox`) may center narrow auth cards (`max-w-md`).
  - Focused quiz-taking player surfaces or deliberate inner visual centerpieces (e.g. centered Top-3 Olympic podium stairs inside `/leaderboard`, modal dialogs, or prose line-length caps `max-w-2xl` on subtitle paragraphs) may constrain *inner* elements while keeping the outer page container aligned to `PAGE_CONTAINER_CLASS`.

## 2. Design System & Styling Consistency

- Follow `DESIGN.md` for all color tokens, typography (`Outfit` for display/body, `JetBrains Mono` with `tabular-nums` for numeric metrics, timers, scores, XP, and ranks), border radii (`rounded-md` controls, `rounded-xl` cards/panels, `rounded-full` chips/avatars), and semantic difficulty colors (Emerald / Amber / Rose).
- Never hardcode hex colors or raw inline `style` attributes for spacing/colors; use semantic theme tokens (`bg-background`, `bg-card`, `bg-popover`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-default`, `text-brand`).
- Follow `.agents/skills/import-order/SKILL.md` for deterministic top-of-file import ordering in all `.ts`/`.tsx` files.
