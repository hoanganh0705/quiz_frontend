

import { cn } from '@/shared/utils/merge-class-names'

export interface SparklineProps {
values: readonly number[]
width?: number
height?: number
stroke?: string

className?: string

'aria-label'?: string
}

const DEFAULT_WIDTH = 80
const DEFAULT_HEIGHT = 24
const GUTTER_RATIO = 0.1

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
