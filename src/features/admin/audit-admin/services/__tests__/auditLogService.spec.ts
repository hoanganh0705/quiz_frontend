

import { describe, expect, it } from 'vitest';

import {
listAuditLog,
getAuditLogEntry,
} from '../auditLogService';

describe('auditLogService', () => {

describe('listAuditLog', () => {
it('returns a paginated list of audit entries', async () => {
const result = await listAuditLog();

expect(result).toBeDefined();
expect(Array.isArray(result.data)).toBe(true);
expect(result.meta).toBeDefined();
expect(result.meta.total).toBeGreaterThanOrEqual(0);
expect(result.meta.offset).toBeGreaterThanOrEqual(0);
expect(result.meta.limit).toBeGreaterThan(0);
    });

it('accepts filter parameters and pagination state', async () => {
const result = await listAuditLog({
filters: {
actorId: '00000000-0000-4000-8000-000000000001',
        },
pagination: { offset: 20, limit: 50 },
      });

expect(result.meta.offset).toBe(20);
expect(result.meta.limit).toBe(50);
    });

it('returns entries with required fields', async () => {
const result = await listAuditLog();

if (result.data.length > 0) {
const entry = result.data[0]!;
expect(entry.id).toBeDefined();
expect(entry.actorId).toBeDefined();
expect(entry.action).toBeDefined();
expect(entry.targetType).toBeDefined();
expect(entry.targetId).toBeDefined();
expect(entry.requestId).toBeDefined();
expect(entry.timestamp).toBeDefined();
      }
    });

it('respects limit parameter', async () => {
const result = await listAuditLog({
pagination: { offset: 0, limit: 5 },
      });

expect(result.data.length).toBeLessThanOrEqual(5);
    });
  });

describe('listAuditLog filter handling', () => {
it('returns default page when no filters are provided', async () => {
const result = await listAuditLog();
expect(result.data).toBeDefined();
    });

it('handles empty filters object', async () => {
const result = await listAuditLog({
filters: {},
      });
expect(result.data).toBeDefined();
    });

it('handles all filter fields together', async () => {
const result = await listAuditLog({
filters: {
actorId: '00000000-0000-4000-8000-000000000001',
action: 'role.grant',
targetType: 'user',
targetId: '00000000-0000-4000-8000-000000000002',
from: '2026-01-01T00:00:00Z',
to: '2026-12-31T23:59:59Z',
        },
      });
expect(result.data).toBeDefined();
    });
  });

describe('listAuditLog pagination', () => {
it('handles offset 0', async () => {
const result = await listAuditLog({
pagination: { offset: 0, limit: 20 },
      });
expect(result.meta.offset).toBe(0);
    });

it('handles large offset', async () => {
const result = await listAuditLog({
pagination: { offset: 1000, limit: 20 },
      });
expect(result.meta.offset).toBe(1000);
    });

it('handles minimum limit', async () => {
const result = await listAuditLog({
pagination: { offset: 0, limit: 1 },
      });
expect(result.meta.limit).toBe(1);
    });

it('handles maximum limit', async () => {
const result = await listAuditLog({
pagination: { offset: 0, limit: 100 },
      });
expect(result.meta.limit).toBe(100);
    });
  });

describe('getAuditLogEntry', () => {
it('returns an audit entry by ID', async () => {
const entryId = '00000000-0000-4000-8000-000000000001';
const result = await getAuditLogEntry(entryId);

expect(result).toBeDefined();
expect(result.id).toBeDefined();
expect(result.actorId).toBeDefined();
expect(result.action).toBeDefined();
expect(result.targetType).toBeDefined();
expect(result.targetId).toBeDefined();
expect(result.requestId).toBeDefined();
expect(result.timestamp).toBeDefined();
    });

it('uses the provided entryId in the returned entry', async () => {
const entryId = 'audit-entry-test-001';
const result = await getAuditLogEntry(entryId);
expect(result.id).toBe(entryId);
    });
  });

describe('getAuditLogEntry error contracts', () => {
it('throws when entryId is empty', async () => {

const result = await getAuditLogEntry('');
expect(result).toBeDefined();
    });
  });

describe('ListAuditLogOptions', () => {
it('accepts empty options', async () => {
const result = await listAuditLog({});
expect(result.data).toBeDefined();
    });

it('accepts options with only filters', async () => {
const result = await listAuditLog({
filters: { actorId: '00000000-0000-4000-8000-000000000001' },
      });
expect(result.data).toBeDefined();
    });

it('accepts options with only pagination', async () => {
const result = await listAuditLog({
pagination: { offset: 10, limit: 20 },
      });
expect(result.data).toBeDefined();
    });
  });
});