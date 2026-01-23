import { useState, useCallback } from 'react'

/**
 * Custom hook for toggling boolean state
 * @param initialValue - Initial boolean value (default: false)
 * @returns [value, toggle, setValue]
 */
export function useToggle(
  initialValue = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => {
    setValue((prev) => !prev)
  }, [])

  return [value, toggle, setValue]
}
