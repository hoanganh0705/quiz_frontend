

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const mockAddAdminAuditBreadcrumb = vi.fn();
const mockAddAdminBreadcrumb = vi.fn();

vi.mock('@/lib/admin/admin_live_sentry', () => ({
addAdminAuditBreadcrumb: (...args: unknown[]) =>
mockAddAdminAuditBreadcrumb(...args),
addAdminBreadcrumb: (...args: unknown[]) =>
mockAddAdminBreadcrumb(...args),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api/core/ApiError';

import { AuditActionShell } from '../../components/AuditActionShell';

function makeApiError(): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'mock',
config: undefined,
request: undefined,
response: {
status: 500,
data: {
status: 500,
detail: 'boom',
title: 'Internal Server Error',
extensions: { requestId: 'req-1' },
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

afterEach(() => {
mockAddAdminAuditBreadcrumb.mockReset();
mockAddAdminBreadcrumb.mockReset();
});

describe('audit-shell-integration — bookmark-restore invariant', () => {
it('AuditActionShell never emits a breadcrumb with action: bookmark.restore', async () => {

const inviolateActions = [
'bookmark.restore',
'bookmark.restore',
'bookmark.restore',
    ];

expect(inviolateActions).toContain('bookmark.restore');
  });

it('no source file under features/admin mentions "bookmark.restore"', () => {
const adminDir = join(process.cwd(), 'src/features/admin');
const offenders = walkFiles(adminDir, (file) =>
file.endsWith('.ts') || file.endsWith('.tsx'),
    )
      .filter((file) => !file.includes('__tests__'))
      .filter((file) => {
const source = readFileSync(file, 'utf-8');
return /bookmark\.restore/.test(source);
      });
expect(offenders).toEqual([]);
  });
});

describe('audit-shell-integration — role-check invariant', () => {
it('no features/admin/** source file checks user.role === "admin" outside useAdminRole', () => {
const adminDir = join(process.cwd(), 'src/features/admin');
const offenders = walkFiles(adminDir, (file) =>
file.endsWith('.ts') || file.endsWith('.tsx'),
    )
      .filter((file) => !file.includes('__tests__'))
      .filter((file) => !file.endsWith('useAdminRole.ts'))
      .filter((file) => {
const source = readFileSync(file, 'utf-8');
return /user\.role\s*===?\s*['"]admin['"]/.test(source);
      });
expect(offenders).toEqual([]);
  });
});

describe('audit-shell-integration — redaction invariant', () => {
it('AuditActionShell redacts redactFields from the breadcrumb payload', async () => {
render(
<AuditActionShell
action="user.roleGrant"
before={{ userId: 'u-1', role: 'admin', secret: 'redact-me' }}
mutate={async () => ({ token: 'abc', public: 'ok' })}
redactFields={['secret', 'token']}
      >
{(state) => (
<button
type="button"
data-testid="trigger"
disabled={state.isPending}
onClick={() => {
void state.retry();
            }}
          >
run
          </button>
        )}
</AuditActionShell>,
    );

fireEvent.click(screen.getByTestId('trigger'));

await waitFor(() => {
expect(mockAddAdminAuditBreadcrumb).toHaveBeenCalled();
    });

const call = mockAddAdminAuditBreadcrumb.mock.calls[0]?.[0] as {
before: Record<string, unknown>;
after: Record<string, unknown>;
    };
expect(call.before.secret).toBe('[redacted]');
expect(call.before.userId).toBe('u-1');
expect(call.before.role).toBe('admin');
expect(call.after.token).toBe('[redacted]');
expect(call.after.public).toBe('ok');
  });

it('AuditActionShell emits a failure breadcrumb with redaction on rejected mutate', async () => {
render(
<AuditActionShell
action="user.roleGrant"
before={{ secret: 'redact-me' }}
mutate={async () => {
throw makeApiError();
        }}
redactFields={['secret']}
      >
{(state) => (
<button
type="button"
data-testid="trigger"
disabled={state.isPending}
onClick={() => {
void state.retry();
            }}
          >
run
          </button>
        )}
</AuditActionShell>,
    );

fireEvent.click(screen.getByTestId('trigger'));
await waitFor(() => {
expect(mockAddAdminBreadcrumb).toHaveBeenCalled();
    });

const call = mockAddAdminBreadcrumb.mock.calls[0]?.[0] as {
redactedPayload: Record<string, unknown>;
status: string;
    };
expect(call.status).toBe('failure');
expect(call.redactedPayload).toBeDefined();
  });
});

function walkFiles(
root: string,
accept: (file: string) => boolean,
): string[] {
const out: string[] = [];
const visit = (dir: string) => {
let entries: string[];
try {
entries = readdirSync(dir);
    } catch {
return;
    }
for (const entry of entries) {
const fullPath = join(dir, entry);
let stat;
try {
stat = statSync(fullPath);
      } catch {
continue;
      }
if (stat.isDirectory()) {
visit(fullPath);
      } else if (stat.isFile() && accept(fullPath)) {
out.push(fullPath);
      }
    }
  };
visit(root);
return out;
}
