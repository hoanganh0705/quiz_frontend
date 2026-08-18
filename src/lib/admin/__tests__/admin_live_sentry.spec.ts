

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAddBreadcrumb = vi.fn();

vi.mock('@sentry/nextjs', () => ({
addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}));

import {
EPIC_7_1_BREADCRUMB_CATEGORY,
ADMIN_EPIC_7_1_VERSION,
addAchievementAdminBreadcrumb,
addAdminAuditBreadcrumb,
addAdminBreadcrumb,
addCategoryAdminBreadcrumb,
addCommentModerationBreadcrumb,
addRankingAdminBreadcrumb,
addReviewModerationBreadcrumb,
addRoleGrantBreadcrumb,
addTagAdminBreadcrumb,
addTournamentAdminBreadcrumb,
redactValue,
} from '../admin_live_sentry';

beforeEach(() => {
mockAddBreadcrumb.mockClear();
});

describe('admin_live_sentry constants', () => {
it('exposes the documented breadcrumb category', () => {
expect(EPIC_7_1_BREADCRUMB_CATEGORY).toBe('admin:7.1');
  });

it('exposes the documented epic version', () => {
expect(ADMIN_EPIC_7_1_VERSION).toBe('1.0.0');
  });
});

describe('addAdminBreadcrumb', () => {
it('emits the documented payload shape with category admin:7.1', () => {
addAdminBreadcrumb({
action: 'tag.create',
route: 'tags.createTag',
status: 'success',
durationMs: 142,
    });

expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
const call = mockAddBreadcrumb.mock.calls[0]?.[0] as {
category: string;
data: Record<string, unknown>;
    };
expect(call.category).toBe('admin:7.1');
expect(call.data.action).toBe('tag.create');
expect(call.data.route).toBe('tags.createTag');
expect(call.data.status).toBe('success');
expect(call.data.durationMs).toBe(142);
expect(call.data.epic).toBe('1.0.0');
  });

it('emits optional fields when provided', () => {
addAdminBreadcrumb({
action: 'ranking.recalculate',
route: 'rankings.recalculate',
targetType: 'ranking-period',
targetId: 'p-1',
status: 'failure',
durationMs: 1200,
code: 'IRREVERSIBLE_CONFIRM_REQUIRED',
requestId: 'req-1',
correlationId: 'corr-1',
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as {
data: Record<string, unknown>;
    };
expect(call.data.targetType).toBe('ranking-period');
expect(call.data.targetId).toBe('p-1');
expect(call.data.code).toBe('IRREVERSIBLE_CONFIRM_REQUIRED');
expect(call.data.requestId).toBe('req-1');
expect(call.data.correlationId).toBe('corr-1');
  });

it('omits optional fields when not provided', () => {
addAdminBreadcrumb({
action: 'noop',
route: 'noop',
status: 'started',
durationMs: 0,
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as {
data: Record<string, unknown>;
    };
expect(call.data).not.toHaveProperty('targetType');
expect(call.data).not.toHaveProperty('targetId');
expect(call.data).not.toHaveProperty('code');
expect(call.data).not.toHaveProperty('requestId');
expect(call.data).not.toHaveProperty('correlationId');
  });

it('redacts configured fields from the payload', () => {
addAdminBreadcrumb({
action: 'user.roleGrant',
route: 'users.grantUserRole',
status: 'failure',
durationMs: 80,
redactedPayload: {
request: { userId: 'u-1', role: 'admin', secret: 'top-secret' },
response: { token: 'abc', public: 'ok' },
      },
redactFields: ['secret', 'token'],
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as {
data: { redactedPayload: Record<string, Record<string, unknown>> };
    };
const redacted = call.data.redactedPayload as unknown as Record<
string,
Record<string, unknown>
    >;
expect(redacted.request.secret).toBe('[redacted]');
expect(redacted.request.userId).toBe('u-1');
expect(redacted.request.role).toBe('admin');
expect(redacted.response.token).toBe('[redacted]');
expect(redacted.response.public).toBe('ok');
  });

it('redacts nested paths when given a dotted expression', () => {
addAdminBreadcrumb({
action: 'noop',
route: 'noop',
status: 'failure',
durationMs: 10,
redactedPayload: {
request: {
body: { secret: 'top-secret', public: 'ok' },
        },
      },
redactFields: ['request.body.secret'],
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as {
data: { redactedPayload: { request: { body: Record<string, unknown> } } };
    };
expect(call.data.redactedPayload.request.body.secret).toBe('[redacted]');
expect(call.data.redactedPayload.request.body.public).toBe('ok');
  });
});

describe('addAdminAuditBreadcrumb', () => {
it('emits the documented payload with before/after state', () => {
addAdminAuditBreadcrumb({
action: 'ranking.recalculate',
route: 'rankings.recalculate',
before: { periodId: 'p-1' },
after: { jobId: 'job-1' },
status: 'success',
durationMs: 1200,
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as {
category: string;
data: Record<string, unknown>;
    };
expect(call.category).toBe('admin:7.1');
expect(call.data.action).toBe('ranking.recalculate');
expect(call.data.before).toEqual({ periodId: 'p-1' });
expect(call.data.after).toEqual({ jobId: 'job-1' });
expect(call.data.status).toBe('success');
expect(call.data.epic).toBe('1.0.0');
  });

it('includes requestId and correlationId when provided', () => {
addAdminAuditBreadcrumb({
action: 'tag.delete',
route: 'tags.deleteTag',
before: { tagId: 't-1' },
after: null,
status: 'failure',
durationMs: 80,
requestId: 'req-1',
correlationId: 'corr-1',
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as {
data: Record<string, unknown>;
    };
expect(call.data.requestId).toBe('req-1');
expect(call.data.correlationId).toBe('corr-1');
  });
});

describe('redactValue', () => {
it('returns the input unchanged when no fields are provided', () => {
expect(redactValue({ a: 1 }, [])).toEqual({ a: 1 });
  });

it('redacts leaf keys', () => {
expect(redactValue({ secret: 'x', public: 'y' }, ['secret'])).toEqual({
secret: '[redacted]',
public: 'y',
    });
  });

it('redacts nested dotted paths', () => {
expect(
redactValue({ a: { b: { secret: 'x', public: 'y' } } }, ['a.b.secret']),
    ).toEqual({ a: { b: { secret: '[redacted]', public: 'y' } } });
  });

it('redacts array elements via path', () => {
expect(redactValue([{ secret: 'x' }, { secret: 'y' }], ['secret'])).toEqual(
[{ secret: '[redacted]' }, { secret: '[redacted]' }],
    );
  });

it('does not throw on null or primitive values', () => {
expect(redactValue(null, ['x'])).toBeNull();
expect(redactValue('hello', ['x'])).toBe('hello');
  });
});

describe('per-area breadcrumb variants', () => {
const cases = [
['addTagAdminBreadcrumb', addTagAdminBreadcrumb, 'tag'],
['addCategoryAdminBreadcrumb', addCategoryAdminBreadcrumb, 'category'],
[
'addReviewModerationBreadcrumb',
addReviewModerationBreadcrumb,
'review-report',
    ],
['addCommentModerationBreadcrumb', addCommentModerationBreadcrumb, 'comment'],
['addRankingAdminBreadcrumb', addRankingAdminBreadcrumb, 'ranking'],
['addAchievementAdminBreadcrumb', addAchievementAdminBreadcrumb, 'achievement'],
['addTournamentAdminBreadcrumb', addTournamentAdminBreadcrumb, 'tournament'],
['addRoleGrantBreadcrumb', addRoleGrantBreadcrumb, 'role'],
  ] as const;

it.each(cases)(
'%s pins targetType to %s and routes through addAdminBreadcrumb',
(_name, fn, expectedType) => {
fn({
action: 'sample',
route: 'sample.route',
status: 'started',
durationMs: 1,
      });
const call = mockAddBreadcrumb.mock.calls[0]?.[0] as {
category: string;
data: Record<string, unknown>;
      };
expect(call.category).toBe(EPIC_7_1_BREADCRUMB_CATEGORY);
expect(call.data.targetType).toBe(expectedType);
expect(call.data.action).toBe('sample');
    },
  );
});
