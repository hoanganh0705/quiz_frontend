'use client'

import type React from 'react'
import { UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { AdminPageHeader } from '../_components'

interface User {
  id: string
  username: string
  email: string
  avatar: string
  role: 'admin' | 'moderator' | 'creator' | 'user'
  quizzes: number
  score: number
  joinedAt: string
  status: 'active' | 'suspended' | 'banned'
}

const mockUsers: User[] = [
  { id: '1', username: 'QuizMaster42', email: 'quizmaster@example.com', avatar: 'QM', role: 'admin', quizzes: 45, score: 12400, joinedAt: '2023-06-01', status: 'active' },
  { id: '2', username: 'HistoryBuff', email: 'historybuff@example.com', avatar: 'HB', role: 'creator', quizzes: 28, score: 8900, joinedAt: '2023-07-15', status: 'active' },
  { id: '3', username: 'ScienceNerd', email: 'scienerd@example.com', avatar: 'SN', role: 'creator', quizzes: 19, score: 6720, joinedAt: '2023-08-20', status: 'active' },
  { id: '4', username: 'CodeMaster', email: 'codemaster@example.com', avatar: 'CM', role: 'moderator', quizzes: 12, score: 5600, joinedAt: '2023-09-10', status: 'active' },
  { id: '5', username: 'TravelBug', email: 'travelbug@example.com', avatar: 'TB', role: 'creator', quizzes: 33, score: 9800, joinedAt: '2023-10-05', status: 'active' },
  { id: '6', username: 'MathGuru', email: 'mathguru@example.com', avatar: 'MG', role: 'creator', quizzes: 8, score: 3400, joinedAt: '2023-11-12', status: 'active' },
  { id: '7', username: 'FilmFan', email: 'filmfan@example.com', avatar: 'FF', role: 'user', quizzes: 3, score: 1200, joinedAt: '2023-12-01', status: 'active' },
  { id: '8', username: 'SpamBot123', email: 'spambot@example.com', avatar: 'SB', role: 'user', quizzes: 156, score: 0, joinedAt: '2024-01-15', status: 'banned' },
  { id: '9', username: 'BookWorm', email: 'bookworm@example.com', avatar: 'BW', role: 'creator', quizzes: 22, score: 7800, joinedAt: '2024-02-01', status: 'active' },
  { id: '10', username: 'GeoPro', email: 'geopro@example.com', avatar: 'GP', role: 'user', quizzes: 0, score: 450, joinedAt: '2024-03-10', status: 'suspended' }
]

const roleConfig = {
  admin: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-400', label: 'Admin' },
  moderator: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400', label: 'Moderator' },
  creator: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', label: 'Creator' },
  user: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'User' }
}

const statusConfig = {
  active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', label: 'Active' },
  suspended: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', label: 'Suspended' },
  banned: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', label: 'Banned' }
}

export default function AdminUsersPage() {
  const handleCreate = () => {
    console.log('Create user')
  }

  const handleEdit = (id: string) => {
    console.log('Edit user:', id)
  }

  const handleSuspend = (id: string) => {
    console.log('Suspend user:', id)
  }

  const handleDelete = (id: string) => {
    console.log('Delete user:', id)
  }

  return (
    <div className='px-4 sm:px-6 pb-8'>
      <AdminPageHeader
        title='Users'
        description='Manage user accounts, roles, and permissions.'
        actionLabel='Add User'
        actionIcon={UserPlus}
        onAction={handleCreate}
      />

      <div className='space-y-3'>
        {mockUsers.map((user) => {
          const role = roleConfig[user.role]
          const status = statusConfig[user.status]
          return (
            <div
              key={user.id}
              className='rounded-lg border border-border p-4 hover:border-default/50 transition-colors'
            >
              <div className='flex items-center justify-between gap-4'>
                <div className='flex items-center gap-3 min-w-0'>
                  <Avatar className='h-10 w-10 shrink-0'>
                    <AvatarFallback className='bg-default text-white-primary text-sm'>
                      {user.avatar}
                    </AvatarFallback>
                  </Avatar>

                  <div className='min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='font-semibold text-foreground'>{user.username}</span>
                      <Badge variant='secondary' className={`${role.bg} ${role.text}`}>
                        {role.label}
                      </Badge>
                      <Badge variant='secondary' className={`${status.bg} ${status.text}`}>
                        {status.label}
                      </Badge>
                    </div>
                    <p className='text-xs text-muted-foreground mt-0.5'>{user.email}</p>
                    <div className='flex items-center gap-4 mt-1'>
                      <span className='text-xs text-muted-foreground'>
                        {user.quizzes} quizzes
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        Score: {user.score.toLocaleString()}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        Joined {user.joinedAt}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-2 shrink-0'>
                  <button
                    onClick={() => handleEdit(user.id)}
                    className='px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors text-foreground'
                  >
                    Edit
                  </button>
                  {user.status !== 'banned' && (
                    <button
                      onClick={() => handleSuspend(user.id)}
                      className='px-3 py-1.5 text-xs font-medium rounded-md border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10 transition-colors'
                    >
                      Suspend
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(user.id)}
                    className='px-3 py-1.5 text-xs font-medium rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors'
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
