
export const getStorageKey = (quizId: string) => `quiz_progress_${quizId}`
export const getResultsKey = (quizId: string) => `quiz_results_${quizId}`

export const formatTime = (seconds: number) => {
const hours = Math.floor(seconds / 3600)
const minutes = Math.floor((seconds % 3600) / 60)
const remainingSeconds = seconds % 60
if (hours > 0) {
return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const getScoreColor = (score: number) => {
if (score >= 80) return 'text-green-500'
if (score >= 60) return 'text-yellow-500'
if (score >= 40) return 'text-orange-500'
return 'text-red-500'
}

export const getScoreMessage = (score: number) => {
if (score === 100) return ' Perfect Score! Outstanding!'
if (score >= 80) return ' Excellent work! You nailed it!'
if (score >= 60) return ' Good job! Keep practicing!'
if (score >= 40) return ' Not bad! Room for improvement.'
return ' Keep studying! You can do better!'
}

export const getScoreGrade = (score: number) => {
if (score >= 90) return 'A+'
if (score >= 80) return 'A'
if (score >= 70) return 'B'
if (score >= 60) return 'C'
if (score >= 50) return 'D'
return 'F'
}

export const getRankStyle = (index: number) => {
if (index === 0) return 'bg-yellow-500 text-yellow-900'
if (index === 1) return 'bg-gray-300 text-gray-700'
if (index === 2) return 'bg-amber-600 text-amber-100'
return 'bg-foreground/10 text-foreground'
}

export const calculatePercentile = (score: number) => {
return Math.min(99, Math.max(1, Math.round(score * 0.95 + 5)))
}

export const calculateAvgTime = (timePerQuestion: Record<number, number>) => {
const times = Object.values(timePerQuestion)
return times.length > 0
? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
: 0
}
