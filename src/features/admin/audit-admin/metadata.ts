

import { ScrollText } from 'lucide-react';

import type { AdminPermission } from '../permissions';

export const AUDIT_LOG_ROUTE_PATH = '/admin/audit' as const;

export const AUDIT_LOG_FEATURE_FLAG = 'admin_audit_live' as const;

export const AUDIT_LOG_METADATA = {

routePath: AUDIT_LOG_ROUTE_PATH,

label: 'Audit log',

icon: ScrollText,

description:
'Browse admin actions: who did what, when, and against which resource.',

requiredPermissions: [
'audit_log_read',
  ] as readonly AdminPermission[],

featureFlag: AUDIT_LOG_FEATURE_FLAG,
} as const;

export type AuditLogMetadata = typeof AUDIT_LOG_METADATA;