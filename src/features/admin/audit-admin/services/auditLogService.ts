

import type {
AuditLogEntryDto,
AuditLogListDto,
AuditLogFilters,
AuditLogPagination,
} from '../types';

export interface ListAuditLogOptions {
readonly filters?: AuditLogFilters;
readonly pagination?: AuditLogPagination;
}

export async function listAuditLog(
options: ListAuditLogOptions = {},
): Promise<AuditLogListDto> {
const filters = options.filters ?? {};
const pagination = options.pagination ?? { offset: 0, limit: 20 };

const params: Record<string, string | number> = {};

if (filters.actorId) params['actorId'] = filters.actorId;
if (filters.action) params['action'] = filters.action;
if (filters.targetType) params['targetType'] = filters.targetType;
if (filters.targetId) params['targetId'] = filters.targetId;
if (filters.from) params['from'] = filters.from;
if (filters.to) params['to'] = filters.to;

params['offset'] = pagination.offset;
params['limit'] = pagination.limit;

return mockListAuditLog(params);
}

export async function getAuditLogEntry(
entryId: string,
): Promise<AuditLogEntryDto> {

return mockGetAuditLogEntry(entryId);
}

function mockListAuditLog(
params: Record<string, string | number>,
): AuditLogListDto {
const offset = Number(params['offset']) || 0;
const limit = Number(params['limit']) || 20;

const mockEntries: AuditLogEntryDto[] = Array.from(
{ length: Math.min(limit, 50) },
(_, i) => ({
id: `audit-${offset + i}-${Date.now()}`,
actorId: 'admin-user-id-123',
action: getMockAction((offset + i) % 5),
targetType: getMockTargetType((offset + i) % 4),
targetId: `target-${offset + i}`,
requestId: `req-${offset + i}-${Date.now()}`,
correlationId: `corr-${offset + i}`,
timestamp: new Date(
Date.now() - (offset + i) * 60 * 60 * 1000,
      ).toISOString(),
payload: {}, // Redacted
    }),
  );

return {
data: mockEntries,
meta: {
total: 150,
offset,
limit,
    },
  };
}

function mockGetAuditLogEntry(entryId: string): AuditLogEntryDto {
return {
id: entryId,
actorId: 'admin-user-id-123',
action: 'role.grant',
targetType: 'user',
targetId: 'target-user-id-456',
requestId: `req-${entryId}`,
correlationId: `corr-${entryId}`,
timestamp: new Date().toISOString(),
payload: {}, // Redacted
  };
}

function getMockAction(index: number): string {
const actions = [
'role.grant',
'role.revoke',
'tournament.delete',
'tag.delete',
'achievement.badge_revoke',
  ];
return actions[index % actions.length]!;
}

function getMockTargetType(index: number): string {
const types = ['user', 'tournament', 'tag', 'achievement'];
return types[index % types.length]!;
}
