import { Check, Clock, Heart, Lock, Medal, Star } from 'lucide-react'

export const badges = [
  {
    id: 'badge-first-try',
    name: 'First Try',
    icon: Check,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    unlocked: true
  },
  {
    id: 'badge-speedster',
    name: 'Speedster',
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    unlocked: true
  },
  {
    id: 'badge-perfect',
    name: 'Perfect',
    icon: Star,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    unlocked: true
  },
  {
    id: 'badge-top-3',
    name: 'Top 3',
    icon: Medal,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    unlocked: true
  },
  {
    id: 'badge-generous',
    name: 'Generous',
    icon: Heart,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    unlocked: true
  },
  {
    id: 'badge-veteran',
    name: 'Veteran',
    icon: Lock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    unlocked: false
  }
]
