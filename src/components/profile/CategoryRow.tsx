import { memo } from 'react'

interface CategoryRowProps {
  label: string
  value: string
}

const CategoryRow = ({ label, value }: CategoryRowProps) => {
  return (
    <div className='flex justify-between items-center'>
      <p className='text-muted-foreground text-sm'>{label}</p>
      <p className='text-base font-bold text-foreground'>{value}</p>
    </div>
  )
}

export default memo(CategoryRow)
