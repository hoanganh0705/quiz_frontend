

import {
act,
fireEvent,
render,
screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useReevaluateUserAchievements } from '../../hooks/useReevaluateUserAchievements';
import { usePermission } from '@/features/admin/hooks/usePermission';

import { ReevaluateButton } from '../ReevaluateButton';

vi.mock('../../hooks/useReevaluateUserAchievements', () => ({
useReevaluateUserAchievements: vi.fn(),
}));

vi.mock('@/features/admin/hooks/usePermission', () => ({
usePermission: vi.fn(),
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';

function makeIdleResult() {
return {
reevaluate: vi.fn<() => Promise<unknown>>().mockResolvedValue({}),
lifecycle: 'idle' as const,
isPending: false,
error: null,
audit: { before: null, after: null },
jobInfo: { isJobIdExposed: false, lifecycle: 'idle' as const },
reset: vi.fn(),
  };
}

function makeApiError(
code: string,
requestId?: string,
): ApiError {
return new ApiError({
isAxiosError: true,
response: {
status: code === 'ADMIN_FORBIDDEN' ? 403 : 409,
data: {
status: code === 'ADMIN_FORBIDDEN' ? 403 : 409,
detail: code,
title: code,
extensions: { code, requestId },
      },
    },
name: 'AxiosError',
message: code,
  });
}

beforeEach(() => {
vi.mocked(useReevaluateUserAchievements).mockReset();
vi.mocked(usePermission).mockReset();
vi.mocked(usePermission).mockReturnValue({ allowed: true });
});

afterEach(() => {
vi.restoreAllMocks();
});

describe('TKT-7.8.D1 — ReevaluateButton', () => {
it('AC #6 — permission denied renders PermissionDeniedNoticeInline', () => {
vi.mocked(usePermission).mockReturnValue({ allowed: false });
vi.mocked(useReevaluateUserAchievements).mockReturnValue(makeIdleResult());

render(<ReevaluateButton userId={USER_ID} />);

expect(
screen.getByTestId('permission-denied-notice'),
    ).toBeInTheDocument();
expect(
screen.queryByTestId('reevaluate-button'),
    ).not.toBeInTheDocument();
  });

it('AC #6 — permission pending renders disabled button', () => {
vi.mocked(usePermission).mockReturnValue({ allowed: null });
vi.mocked(useReevaluateUserAchievements).mockReturnValue(makeIdleResult());

render(<ReevaluateButton userId={USER_ID} />);

expect(
screen.getByRole('button', { name: /checking permissions/i }),
    ).toBeDisabled();
  });

it('AC #1 — idle renders primary button "Re-evaluate achievements"', () => {
const result = makeIdleResult();
vi.mocked(useReevaluateUserAchievements).mockReturnValue(result);

render(<ReevaluateButton userId={USER_ID} />);

const btn = screen.getByTestId('reevaluate-button');
expect(btn).toBeInTheDocument();
expect(btn).toHaveTextContent('Re-evaluate achievements');
expect(btn).not.toBeDisabled();
  });

it('AC #1 — click invokes reevaluate()', async () => {
const result = makeIdleResult();
vi.mocked(useReevaluateUserAchievements).mockReturnValue(result);

render(<ReevaluateButton userId={USER_ID} />);

await act(async () => {
fireEvent.click(screen.getByTestId('reevaluate-button'));
    });

expect(result.reevaluate).toHaveBeenCalledTimes(1);
  });

it('AC #2 — running renders secondary button with spinner and is disabled', () => {
vi.mocked(useReevaluateUserAchievements).mockReturnValue({
...makeIdleResult(),
lifecycle: 'running',
isPending: true,
    });

render(<ReevaluateButton userId={USER_ID} />);

const btn = screen.getByTestId('reevaluate-button');
expect(btn).toHaveTextContent('Re-evaluation running…');
expect(btn).toBeDisabled();
  });

it('AC #3 — completed renders primary button "Re-evaluate again"', () => {
vi.mocked(useReevaluateUserAchievements).mockReturnValue({
...makeIdleResult(),
lifecycle: 'completed',
    });

render(<ReevaluateButton userId={USER_ID} />);

const btn = screen.getByTestId('reevaluate-button');
expect(btn).toHaveTextContent('Re-evaluate again');
expect(btn).not.toBeDisabled();
  });

it('AC #4 — failed renders primary button "Retry re-evaluation"', () => {
vi.mocked(useReevaluateUserAchievements).mockReturnValue({
...makeIdleResult(),
lifecycle: 'failed',
    });

render(<ReevaluateButton userId={USER_ID} />);

const btn = screen.getByTestId('reevaluate-button');
expect(btn).toHaveTextContent('Retry re-evaluation');
  });

it('AC #5 — REVAL_RUNNING renders notice', () => {
vi.mocked(useReevaluateUserAchievements).mockReturnValue({
...makeIdleResult(),
lifecycle: 'running',
error: makeApiError('REVAL_RUNNING'),
    });

render(<ReevaluateButton userId={USER_ID} />);

expect(
screen.getByTestId('reevaluate-reval-running-notice'),
    ).toBeInTheDocument();
  });

it('AC #7 — non-REVAL_RUNNING error surfaces RequestIdBannerInline', () => {
vi.mocked(useReevaluateUserAchievements).mockReturnValue({
...makeIdleResult(),
lifecycle: 'failed',
error: makeApiError('ADMIN_FORBIDDEN', 'req-123'),
    });

render(<ReevaluateButton userId={USER_ID} />);

expect(screen.getByTestId('admin-request-id-banner')).toBeInTheDocument();
expect(screen.getByTestId('admin-request-id-banner')).toBeInTheDocument();
  });
});
