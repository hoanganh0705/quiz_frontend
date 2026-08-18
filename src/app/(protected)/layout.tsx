

import type { ReactNode } from 'react';
import { ProtectedShell } from './_components/ProtectedShell';

export default function ProtectedLayout({
children
}: {
children: ReactNode
}) {
return <ProtectedShell>{children}</ProtectedShell>;
}