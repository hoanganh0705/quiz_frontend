import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProtectedShell } from './_components/ProtectedShell';
import { hasUsableSession } from '@/features/auth/utils/auth-cookies';

export default async function ProtectedLayout({
children
}: {
children: ReactNode
}) {
const headerStore = await headers();
const request = new Request('http://internal', {
headers: headerStore,
  });

if (!hasUsableSession(request)) {
redirect('/login');
  }

return <ProtectedShell>{children}</ProtectedShell>;
}