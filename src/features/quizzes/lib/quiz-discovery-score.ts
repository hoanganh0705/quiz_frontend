

export function getPopularityScore(quiz: {
currentPlayers: number
isPopular?: boolean
rating: number
}) {
return quiz.currentPlayers + (quiz.isPopular ? 15 : 0) + quiz.rating * 4
}

export function getTrendingScore(quiz: {
currentPlayers: number
rating: number
quizReview?: { length: number }
isFeatured?: boolean
}) {
return (
quiz.currentPlayers * 2 +
quiz.rating * 8 +
(quiz.quizReview?.length ?? 0) * 3 +
(quiz.isFeatured ? 8 : 0)
  )
}

export function calculateDurationInMinutes(durationInSeconds: number): number {
return Math.max(1, Math.round(durationInSeconds / 60))
}
