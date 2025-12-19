'use client'

import { useMemo } from 'react'

interface SpotAvailabilityIndicatorProps {
  currentSpots: number
  totalSpots: number
  mode?: 'default' | 'percentage'
}

export default function SpotAvailabilityIndicator({
  currentSpots,
  totalSpots,
  mode = 'default'
}: SpotAvailabilityIndicatorProps) {
  // Đảm bảo currentSpots không vượt quá totalSpots
  const displaySpots = Math.max(0, Math.min(currentSpots, totalSpots))
  const displayTotal = Math.max(1, totalSpots)

  const availablePercentage = displaySpots / displayTotal

  // Màu sắc cho cả hai chế độ (dựa trên availablePercentage)
  const segmentColor = useMemo(() => {
    if (availablePercentage < 0.1) return 'rgb(239, 68, 68)' // Đỏ khi chỗ trống dưới 10%
    return 'rgb(255, 255, 255)' // Trắng nếu không
  }, [availablePercentage])

  const unoccupiedSegmentColor = 'rgb(55, 65, 81)'
  const radius = 10
  const circumference = 2 * Math.PI * radius

  return (
    <div className='flex items-center justify-center bg-transparent text-foreground rounded-lg'>
      {mode === 'default' && (
        <div className='w-6 h-6 flex items-center justify-center'>
          <svg className='w-full h-full' viewBox='0 0 24 24'>
            <circle
              cx='12'
              cy='12'
              r={radius}
              strokeWidth='4'
              fill='none'
              stroke={unoccupiedSegmentColor}
            />
            <circle
              cx='12'
              cy='12'
              r={radius}
              strokeWidth='4'
              fill='none'
              stroke={segmentColor}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - availablePercentage)}
              strokeLinecap='round'
              transform='rotate(-90 12 12)'
            />
          </svg>
        </div>
      )}

      {mode === 'percentage' && (
        <div className='relative w-10 h-10 flex items-center justify-center bg-transparent text-foreground'>
          <svg className='absolute w-full h-full' viewBox='0 0 24 24'>
            <circle
              cx='12'
              cy='12'
              r={radius}
              strokeWidth='1.5'
              fill='none'
              stroke={unoccupiedSegmentColor}
            />
            <circle
              cx='12'
              cy='12'
              r={radius}
              strokeWidth='1.5'
              fill='none'
              stroke={segmentColor}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - availablePercentage)}
              strokeLinecap='round'
              transform='rotate(-90 12 12)'
            />
          </svg>
          <span className='text-[10px] text-foreground z-10 font-medium'>
            {Math.round(availablePercentage * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}
