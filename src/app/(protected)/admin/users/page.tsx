'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  User as UserIcon,
  CheckCircle2,
  MoreVertical,
  Flame,
  Trash2,
  RefreshCw,
  ArrowRight,
  KeyRound,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Label } from '@/components/ui/Label'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/lib/forms/useToast'
import { useAdminUserList } from '@/features/admin/hooks/useAdminUserList'
import type { AdminUserDto } from '@/features/admin/services/user-admin.service'
import { AdminPageHeader } from '../_components'

export default function AdminUsersPage() {
  const {
    users,
    pagination,
    isLoading,
    query,
    setSearch,
    setRole,
    setPage,
    createUser,
    updateRole,
    removeUser,
    refresh,
  } = useAdminUserList()

  const { push } = useToast()

  // Local state for modals
  const [createOpen, setCreateOpen] = React.useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<AdminUserDto | null>(null)

  // Create form state
  const [createUsername, setCreateUsername] = React.useState('')
  const [createEmail, setCreateEmail] = React.useState('')
  const [createPassword, setCreatePassword] = React.useState('')
  const [createDisplayName, setCreateDisplayName] = React.useState('')
  const [createRole, setCreateRole] = React.useState<'user' | 'moderator' | 'admin'>('user')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Role edit state
  const [targetRole, setTargetRole] = React.useState<'user' | 'moderator' | 'admin'>('user')

  // Search input debounce/local
  const [searchInput, setSearchInput] = React.useState(query.search ?? '')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const handleOpenCreate = () => {
    setCreateUsername('')
    setCreateEmail('')
    setCreatePassword('')
    setCreateDisplayName('')
    setCreateRole('user')
    setCreateOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createUsername.trim() || !createEmail.trim() || !createPassword.trim()) {
      push({ title: 'Validation error', body: 'Please fill in all required fields.', durationMs: 4000 })
      return
    }

    try {
      setIsSubmitting(true)
      await createUser({
        username: createUsername.trim(),
        email: createEmail.trim(),
        password: createPassword.trim(),
        displayName: createDisplayName.trim() || undefined,
        role: createRole,
        isVerified: true,
      })
      push({
        title: 'User created',
        body: `User "${createUsername.trim()}" has been created successfully.`,
        durationMs: 5000,
      })
      setCreateOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create user account'
      push({ title: 'Creation failed', body: msg, durationMs: 5000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenRoleEdit = (user: AdminUserDto) => {
    setSelectedUser(user)
    setTargetRole(user.role)
    setRoleDialogOpen(true)
  }

  const handleRoleSubmit = async () => {
    if (!selectedUser) return
    try {
      setIsSubmitting(true)
      await updateRole(selectedUser.userId, targetRole)
      push({
        title: 'Role updated',
        body: `Role for ${selectedUser.username} set to "${targetRole}".`,
        durationMs: 4000,
      })
      setRoleDialogOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user role'
      push({ title: 'Update failed', body: msg, durationMs: 5000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenDelete = (user: AdminUserDto) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return
    try {
      setIsSubmitting(true)
      await removeUser(selectedUser.userId)
      push({
        title: 'User deleted',
        body: `Account for ${selectedUser.username} has been soft-deleted.`,
        durationMs: 4000,
      })
      setDeleteDialogOpen(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user account'
      push({ title: 'Action failed', body: msg, durationMs: 5000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='px-4 sm:px-6 pb-8 space-y-6'>
      <AdminPageHeader
        title='Users'
        description='Manage user accounts, roles, and permissions.'
        actionLabel='Add User'
        actionIcon={UserPlus}
        onAction={handleOpenCreate}
      />

      {/* Bento Sub-Banner for Fine-Grained Role Flow */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-brand/20 bg-brand/5 text-foreground'>
        <div className='flex items-center gap-3'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 border border-brand/25 text-brand'>
            <KeyRound className='size-4' />
          </div>
          <div>
            <p className='text-sm font-semibold'>Role & Permission Granular Moderation</p>
            <p className='text-xs text-muted-foreground'>
              Need to grant individual admin rights such as category or comment moderation?
            </p>
          </div>
        </div>
        <Button variant='outline' size='sm' asChild className='shrink-0 gap-1.5 border-brand/30 text-brand hover:bg-brand/10'>
          <Link href='/admin/users/roles'>
            Manage roles & permissions <ArrowRight className='size-3.5' />
          </Link>
        </Button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between bg-card p-3 rounded-xl border border-border shadow-xs'>
        <form onSubmit={handleSearchSubmit} className='flex-1 relative flex items-center min-w-60'>
          <Search className='absolute left-3 size-4 text-muted-foreground pointer-events-none' />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='Search by username, email, or name...'
            className='pl-9 h-9 text-xs'
          />
        </form>

        <div className='flex items-center gap-2.5 shrink-0'>
          <Select
            value={query.role ?? 'all'}
            onValueChange={(val) => setRole(val === 'all' ? undefined : (val as 'user' | 'moderator' | 'admin'))}
          >
            <SelectTrigger className='h-9 w-32.5 text-xs'>
              <SelectValue placeholder='All Roles' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Roles</SelectItem>
              <SelectItem value='admin'>Admin</SelectItem>
              <SelectItem value='moderator'>Moderator</SelectItem>
              <SelectItem value='user'>User</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant='ghost'
            size='icon'
            onClick={() => refresh()}
            aria-label='Refresh user list'
            className='size-9 text-muted-foreground hover:text-foreground'
          >
            <RefreshCw className='size-4' />
          </Button>
        </div>
      </div>

      {/* User Table Surface */}
      <div className='rounded-xl border border-border bg-card overflow-hidden shadow-xs'>
        {isLoading ? (
          <div className='p-6 space-y-4'>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className='flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0'>
                <div className='flex items-center gap-3'>
                  <Skeleton className='size-10 rounded-full' />
                  <div className='space-y-1.5'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-3 w-48' />
                  </div>
                </div>
                <Skeleton className='h-6 w-20 rounded-full' />
                <Skeleton className='h-6 w-16 rounded-full' />
                <Skeleton className='h-8 w-8 rounded-md' />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className='py-12'>
            <EmptyState
              icon={UserIcon}
              title='No users found'
              description='No user accounts match your search or filter parameters.'
              size='md'
            />
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-muted/50 border-b border-border text-xs uppercase font-semibold text-muted-foreground'>
                <tr>
                  <th scope='col' className='px-4 py-3'>User</th>
                  <th scope='col' className='px-4 py-3'>Display Name</th>
                  <th scope='col' className='px-4 py-3'>Role</th>
                  <th scope='col' className='px-4 py-3'>Status</th>
                  <th scope='col' className='px-4 py-3'>Streak</th>
                  <th scope='col' className='px-4 py-3'>Joined</th>
                  <th scope='col' className='px-4 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60'>
                {users.map((u) => (
                  <tr key={u.userId} className='hover:bg-muted/30 transition-colors'>
                    {/* User Identity */}
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-3'>
                        <div className='size-9 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-xs text-brand shrink-0'>
                          {u.displayName ? u.displayName.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                        </div>
                        <div className='min-w-0'>
                          <p className='font-semibold text-foreground truncate'>{u.username}</p>
                          <p className='text-xs text-muted-foreground truncate'>{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Display Name */}
                    <td className='px-4 py-3 text-muted-foreground'>
                      {u.displayName || '—'}
                    </td>

                    {/* Role Badge */}
                    <td className='px-4 py-3'>
                      {u.role === 'admin' ? (
                        <Badge className='bg-brand/15 text-brand border border-brand/30 hover:bg-brand/20 gap-1'>
                          <ShieldCheck className='size-3' /> Admin
                        </Badge>
                      ) : u.role === 'moderator' ? (
                        <Badge className='bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 gap-1'>
                          <Shield className='size-3' /> Moderator
                        </Badge>
                      ) : (
                        <Badge variant='secondary' className='text-muted-foreground'>
                          User
                        </Badge>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className='px-4 py-3'>
                      {u.isVerified ? (
                        <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 gap-1'>
                          <CheckCircle2 className='size-3' /> Verified
                        </Badge>
                      ) : (
                        <Badge variant='outline' className='bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'>
                          Pending
                        </Badge>
                      )}
                    </td>

                    {/* Streak */}
                    <td className='px-4 py-3 font-mono text-xs text-muted-foreground'>
                      <span className='inline-flex items-center gap-1'>
                        <Flame className='size-3.5 text-amber-500' />
                        {u.currentStreak}d
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td className='px-4 py-3 font-mono text-xs text-muted-foreground'>
                      {formatDate(u.createdAt)}
                    </td>

                    {/* Actions Menu */}
                    <td className='px-4 py-3 text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon' className='size-8 text-muted-foreground'>
                            <MoreVertical className='size-4' />
                            <span className='sr-only'>Open actions menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-48'>
                          <DropdownMenuItem onClick={() => handleOpenRoleEdit(u)}>
                            <Shield className='size-4 mr-2' /> Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/roles`}>
                              <KeyRound className='size-4 mr-2' /> Permissions
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenDelete(u)}
                            className='text-destructive focus:text-destructive focus:bg-destructive/10'
                          >
                            <Trash2 className='size-4 mr-2' /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination && pagination.total > 0 && (
          <div className='flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground'>
            <div>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={pagination.page <= 1}
                onClick={() => setPage(pagination.page - 1)}
                className='h-7 px-2.5 text-xs'
              >
                Previous
              </Button>
              <span className='font-mono px-2'>
                Page {pagination.page}
              </span>
              <Button
                variant='outline'
                size='sm'
                disabled={!pagination.hasMore}
                onClick={() => setPage(pagination.page + 1)}
                className='h-7 px-2.5 text-xs'
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create User */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-112.5'>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account with initial role and pre-verified email credentials.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='create-username'>Username *</Label>
                <Input
                  id='create-username'
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  placeholder='e.g. trivia_king'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='create-email'>Email Address *</Label>
                <Input
                  id='create-email'
                  type='email'
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder='user@example.com'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='create-password'>Initial Password *</Label>
                <Input
                  id='create-password'
                  type='password'
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder='At least 8 characters'
                  minLength={8}
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='create-display-name'>Display Name (Optional)</Label>
                <Input
                  id='create-display-name'
                  value={createDisplayName}
                  onChange={(e) => setCreateDisplayName(e.target.value)}
                  placeholder='Public name shown on profile'
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='create-role'>System Role</Label>
                <Select
                  value={createRole}
                  onValueChange={(val) => setCreateRole(val as 'user' | 'moderator' | 'admin')}
                >
                  <SelectTrigger id='create-role'>
                    <SelectValue placeholder='Select role' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='user'>User (Standard Player)</SelectItem>
                    <SelectItem value='moderator'>Moderator (Content & Reviews)</SelectItem>
                    <SelectItem value='admin'>Admin (Full Privileges)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Change Role */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className='sm:max-w-100'>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Assign a new system role to <strong>{selectedUser?.username}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className='py-4 space-y-3'>
            <Label htmlFor='edit-role'>Role Assignment</Label>
            <Select
              value={targetRole}
              onValueChange={(val) => setTargetRole(val as 'user' | 'moderator' | 'admin')}
            >
              <SelectTrigger id='edit-role'>
                <SelectValue placeholder='Select role' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='user'>User</SelectItem>
                <SelectItem value='moderator'>Moderator</SelectItem>
                <SelectItem value='admin'>Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRoleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Save Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Delete User Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className='sm:max-w-105'>
          <DialogHeader>
            <DialogTitle className='text-destructive'>Delete User Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to soft-delete <strong>{selectedUser?.username}</strong>? This will revoke active sessions and prevent the account from logging in.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDeleteSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}
