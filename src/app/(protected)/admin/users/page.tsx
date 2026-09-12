'use client'

import type React from 'react'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { AdminPageHeader, FeaturePlaceholderBanner } from '../_components'
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

      <FeaturePlaceholderBanner
        title='Admin user management coming soon'
        description={
          <>
            The user-management surface will use the admin moderation endpoints.
            Until then, the role assignment flow is available at{' '}
            <code className='rounded bg-background px-1 py-0.5 text-xs'>
              /admin/users/roles
            </code>
            .
          </>
        }
        codexLink='useAdminUserList'
        cta={
          <Link
            href='/admin/users/roles'
            className='text-sm font-medium text-brand hover:underline'
          >
            Manage roles in the meantime →
          </Link>
        }
      />
    </div>
  )
}
