import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'

interface QuizCardCreatorProps {
  imageURL?: string | null
  name: string
  avatarClassName?: string
  nameClassName?: string
  containerClassName?: string
}

export function QuizCardCreator({
  imageURL,
  name,
  avatarClassName = '',
  nameClassName = '',
  containerClassName = 'flex items-center gap-2'
}: QuizCardCreatorProps) {
  const fallbackInitials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)

  return (
    <div className={containerClassName}>
      <Avatar className={avatarClassName}>
        <AvatarImage src={imageURL || '/placeholder.svg'} alt={name} />
        <AvatarFallback>{fallbackInitials}</AvatarFallback>
      </Avatar>
      <span className={nameClassName}>{name}</span>
    </div>
  )
}
