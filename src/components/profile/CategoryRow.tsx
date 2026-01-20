interface CategoryRowProps {
  label: string
  value: string
}

export function CategoryRow({ label, value }: CategoryRowProps) {
  return (
    <div className='flex justify-between items-center'>
      <p className='text-muted-foreground text-sm'>{label}</p>
      <p className='text-foreground font-medium'>{value}</p>
    </div>
  )
}
