export interface Tournament {
  id: number
  title: string
  description: string
  image: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  status: string
  statusColor: string
  participants: number
  prize: string
  dateRange: string
  closingInfo?: string
  startDate: string // ISO format
  endDate: string // ISO format
  registrationOpen: boolean
  category: string
}
