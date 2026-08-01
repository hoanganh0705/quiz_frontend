/**
 * `<Sparkline>` — minimal SVG sparkline for displaying recent activity.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.C6 (vendor primitive).
 *
 * Renders a single `<svg>` element with a smooth polyline over the
 * provided data points. The component is intentionally minimal — no
 * axes, no tooltips, no interactive elements — matching the
 * planning-doc rule that analytics surfaces are read-only.
 *
 * The sparkline is reused by Story 3.6's quiz analytics panel
 * (TKT-3.6 — the pattern is established here). The contract:
 *
 *   - `values: readonly number[]` — the data series
 *   - `width`, `height` — explicit pixel dimensions (default 80×24)
 *   - `stroke` — line color (default `currentColor`)
 *
 * The component scales the values linearly to the viewport so the
 * line uses ~90% of the available height (with a 5% top + 5% bottom
 * gutter). A flat-line input (all values equal) renders as a
 * horizontal line at the midpoint — it does not divide-by-zero.
 *
 * The component is a server-renderable prop-driven renderer — no
 * `'use client'`. Consumers render it inside client components.
 */
import { cn } from '@/shared/utils/merge-class-names'

export interface SparklineProps {
  values: readonly number[]
  width?: number
  height?: number
  stroke?: string
  /** Optional className for the outer SVG (e.g. for sizing). */
  className?: string
  /** Optional aria-label for accessibility. */
  'aria-label'?: string
}

const DEFAULT_WIDTH = 80
const DEFAULT_HEIGHT = 24
const GUTTER_RATIO = 0.1 // 10% of height, split 5% top + 5% bottom

export function Sparkline({
  values,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  stroke = 'currentColor',
  className,
  'aria-label': ariaLabel,
}: SparklineProps): React.ReactElement | null {
  if (values.length === 0) return null

  const safeValues = values.map((v) => (Number.isFinite(v) ? v : 0))
  const min = Math.min(...safeValues)
  const max = Math.max(...safeValues)
  const range = max - min
  const innerHeight = height * (1 - 2 * GUTTER_RATIO)
  const yOffset = height * GUTTER_RATIO

  // Flat line: render at the midline. Avoids divide-by-zero and keeps
  // the visual informative ("activity is steady").
  if (range === 0) {
    const y = yOffset + innerHeight / 2
    const points = safeValues
      .map((_, i) => {
        const x = (i / Math.max(1, safeValues.length - 1)) * width
        return `${x},${y}`
      })
      .join(' ')
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn('block', className)}
        aria-hidden={ariaLabel ? undefined : true}
        aria-label={ariaLabel}
        data-testid='sparkline'
        data-points={safeValues.length}
        role='img'
      >
        <polyline
          points={points}
          fill='none'
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    )
  }

  const points = safeValues
    .map((value, i) => {
      const x = (i / Math.max(1, safeValues.length - 1)) * width
      const normalized = (value - min) / range
      const y = yOffset + innerHeight * (1 - normalized)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('block', className)}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      data-testid='sparkline'
      data-points={safeValues.length}
      role='img'
    >
      <polyline
        points={points}
        fill='none'
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
