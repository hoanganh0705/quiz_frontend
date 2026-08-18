'use client'

import type React from 'react'
import { UserPlus } from 'lucide-react'
import { AdminPageHeader } from '../_components'
import { logger } from '@/shared/log'

export default function AdminUsersPage() {
const handleCreate = () => {
logger.debug('admin.users', 'Create user (stub — admin user-management feature not yet wired)')
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

<div className='rounded-lg border border-dashed border-border p-8 text-center bg-muted/30'>
<h2 className='text-lg font-semibold text-foreground'>
Admin user management coming soon
        </h2>
<p className='text-sm text-muted-foreground mt-2 max-w-md mx-auto'>
The user-management surface will use{' '}
<code className='rounded bg-background px-1 py-0.5 text-xs'>
useAdminUserList
          </code>{' '}
and the admin moderation endpoints. Until then, the role
          assignment flow is available at{' '}
<code className='rounded bg-background px-1 py-0.5 text-xs'>
/admin/users/roles
          </code>
.
        </p>
</div>
</div>
  )
}