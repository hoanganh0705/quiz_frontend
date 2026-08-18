'use client'

import type React from 'react'
import Link from 'next/link'
import {
User,
Settings,
LogOut,
ChevronDown
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuLabel,
DropdownMenuSeparator,
DropdownMenuTrigger
} from '@/components/ui/DropdownMenu'
import { Button } from '@/components/ui/Button'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { useUser } from '@/features/users/store/user-store'
import { useMemo } from 'react'

interface UserAvatarDropdownProps {
variant?: 'sidebar' | 'header'
}

export function UserAvatarDropdown({ variant = 'header' }: UserAvatarDropdownProps) {
const user = useUser()
const { logout } = useLogout()

const avatarLabel = useMemo(() => {
const value = user?.displayName || user?.username || user?.email || 'User'
const parts = value.trim().split(' ')
if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }, [user])

if (!user) return null

return (
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button
variant='ghost'
className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors ${
variant === 'sidebar'
? 'w-full justify-start text-foreground'
: 'h-auto text-foreground'
}`}
        >
<Avatar className="h-9 w-9 sm:h-8 sm:w-8 shrink-0">
{user.avatarUrl ? (
<AvatarImage
src={user.avatarUrl}
alt={user.displayName || user.username || 'User'}
className="object-cover w-full h-full rounded-full"
              />
            ) : (
<AvatarFallback className="bg-brand text-white-primary text-xs">
{avatarLabel}
</AvatarFallback>
            )}
</Avatar>
{variant === 'header' && (
<span className='hidden sm:inline text-sm font-medium'>
{user.displayName || user.username}
</span>
          )}
<ChevronDown className='h-3 w-3 text-muted-foreground hidden sm:block' />
</Button>
</DropdownMenuTrigger>

<DropdownMenuContent align={variant === 'sidebar' ? 'start' : 'end'} sideOffset={8} className='w-52'>
<DropdownMenuLabel className='font-normal'>
<div className='flex flex-col space-y-1'>
<p className='text-sm font-medium leading-none'>
{user.displayName || user.username || 'User'}
</p>
{user.email && (
<p className='text-xs leading-none text-muted-foreground'>
{user.email}
</p>
            )}
</div>
</DropdownMenuLabel>

<DropdownMenuSeparator />

<DropdownMenuItem asChild>
<Link href='/my-profile' className='cursor-pointer'>
<User className='mr-2 h-4 w-4' />
My Profile
          </Link>
</DropdownMenuItem>

<DropdownMenuItem asChild>
<Link href='/settings' className='cursor-pointer'>
<Settings className='mr-2 h-4 w-4' />
Settings
          </Link>
</DropdownMenuItem>

<DropdownMenuSeparator />

<DropdownMenuItem
onClick={() => logout()}
className='text-destructive focus:text-destructive cursor-pointer'
        >
<LogOut className='mr-2 h-4 w-4' />
Log out
        </DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
  )
}
