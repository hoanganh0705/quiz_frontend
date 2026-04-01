import { Star } from 'lucide-react'

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div
      className='flex gap-1'
      role='img'
      aria-label={`Rating: ${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden='true'
          className={`w-4 h-4 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'dark:fill-gray-600 dark:text-gray-600 fill-white text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

export default StarRating
