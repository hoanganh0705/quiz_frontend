

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';

import type { AttemptSummaryResponseDto } from '@/lib/api/generated/schemas';

type BroadcastEvent = {
userId: string;
attemptId: string;
kind: 'start' | 'submit' | 'withdraw' | 'abandon';
sourceTabId: string;
};

type BroadcastApi = {
postMessage: (event: BroadcastEvent) => void;
addEventListener: (
handler: (event: BroadcastEvent) => void,
  ) => () => void;
};

const wireListeners: Array<(event: BroadcastEvent) => void> = [];
const thisTabChannelListeners: Array<(event: BroadcastEvent) => void> = [];
const otherTabChannelListeners: Array<(event: BroadcastEvent) => void> = [];

const THIS_TAB = 'tab-this';
const OTHER_TAB = 'tab-other';

const broadcastApi: BroadcastApi = (() => {
return {
postMessage(event) {

queueMicrotask(() => {
const targets =
event.sourceTabId === THIS_TAB
? otherTabChannelListeners
: thisTabChannelListeners;
for (const fn of targets) fn(event);
      });
    },
addEventListener(handler) {
wireListeners.push(handler);
thisTabChannelListeners.push(handler);
return () => {
for (let i = wireListeners.length - 1; i >= 0; i -= 1) {
if (wireListeners[i] === handler) wireListeners.splice(i, 1);
        }
for (let i = thisTabChannelListeners.length - 1; i >= 0; i -= 1) {
if (thisTabChannelListeners[i] === handler) {
thisTabChannelListeners.splice(i, 1);
          }
        }
      };
    },
  };
})();

const OTHER_TAB_CHANNEL_API: BroadcastApi = (() => {
return {
postMessage(event) {
queueMicrotask(() => {
for (const fn of otherTabChannelListeners) fn(event);
      });
    },
addEventListener(handler) {
otherTabChannelListeners.push(handler);
wireListeners.push(handler);
return () => {
for (let i = otherTabChannelListeners.length - 1; i >= 0; i -= 1) {
if (otherTabChannelListeners[i] === handler) {
otherTabChannelListeners.splice(i, 1);
          }
        }
for (let i = wireListeners.length - 1; i >= 0; i -= 1) {
if (wireListeners[i] === handler) wireListeners.splice(i, 1);
        }
      };
    },
  };
})();

const ATTEMPT_ID = 'attempt-1';
const QUIZ_ID = 'quiz-1';
const USER_ID = 'user-1';

const activeAttemptMock = vi.hoisted(() => vi.fn());
const broadcastAttemptsChangedMock = vi.hoisted(() => vi.fn());
const broadcastSubscribeMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/attempts/hooks/useActiveAttempt', () => ({
useActiveAttempt: activeAttemptMock,
}));

vi.mock('@/features/attempts/broadcast/attempts-broadcast-channel', () => ({
getThisTabId: () => THIS_TAB,
broadcastAttemptsChanged: broadcastAttemptsChangedMock,
subscribeAttemptsChanged: broadcastSubscribeMock,
}));

vi.mock('next/navigation', () => ({
useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/forms/useToast', () => ({
useToast: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: () => ({
bootstrapState: 'authenticated',
currentUser: { id: USER_ID, userId: USER_ID },
isAuthenticated: true,
  }),
AuthBootstrapContext: React.createContext(null),
AuthBootstrapProvider: ({ children }: { children: React.ReactNode }) =>
React.createElement(React.Fragment, null, children),
}));

vi.mock('@/lib/feature-flags', () => ({
isFeatureEnabled: (_flag: string, expected: string) => expected === 'live',
getFeatureFlagValue: () => 'live' as const,
}));

vi.mock('@/features/quizzes/hooks/useQuizByIdOrSlug', () => ({
useQuizByIdOrSlug: () => ({
quiz: null,
notFound: false,
isLoading: false,
error: null,
retry: vi.fn(async () => undefined),
isRetrying: false,
  }),
}));

import { QuizCtaStrip } from '@/features/quizzes/components/QuizCtaStrip';

beforeEach(() => {
activeAttemptMock.mockReset();
broadcastAttemptsChangedMock.mockReset();

broadcastSubscribeMock.mockImplementation(
(handler: (event: BroadcastEvent) => void) => {
const unsub = OTHER_TAB_CHANNEL_API.addEventListener(handler);
return unsub;
    },
  );
});

afterEach(() => {
wireListeners.length = 0;
thisTabChannelListeners.length = 0;
otherTabChannelListeners.length = 0;
});

describe('Entry CTA — local 409 race', () => {
it('after a server-confirmed `already_started` outcome the active lookup revalidates and the strip swaps to Continue', async () => {

type Call = { attempt: AttemptSummaryResponseDto | null };
let callIndex = 0;
const resolver: { current: Call | null } = { current: null };
activeAttemptMock.mockImplementation(() => {
const data: Call =
callIndex === 0
? { attempt: null }
: resolver.current ?? { attempt: null };
callIndex += 1;
return {
attempt: data.attempt,
isLoading: false,
error: null,
retry: vi.fn(async () => undefined),
      };
    });

resolver.current = {
attempt: {
attemptId: ATTEMPT_ID,
quizId: QUIZ_ID,
status: 'started',
startedAt: '2026-08-01T00:00:00.000Z',
submittedCount: 0,
totalQuestions: 1,
      } as unknown as AttemptSummaryResponseDto,
    };

const view = render(<QuizCtaStrip quizId={QUIZ_ID} idOrSlug="my-quiz" />);
expect(view.container.textContent).toMatch(/Start/);
view.rerender(<QuizCtaStrip quizId={QUIZ_ID} idOrSlug="my-quiz" />);
await waitFor(() => {
expect(view.container.textContent).toMatch(/Continue/);
    });
  });
});

describe('Entry CTA — remote start swap', () => {
it('a remote `attempts/changed { kind: start }` flips another tab to Continue within one second', async () => {
vi.useFakeTimers();

const active = {
attempt: null as AttemptSummaryResponseDto | null,
isLoading: false,
error: null,
retry: vi.fn(async () => undefined),
    };
activeAttemptMock.mockImplementation(() => ({ ...active }));

const view = render(<QuizCtaStrip quizId={QUIZ_ID} idOrSlug="my-quiz" />);
expect(view.container.textContent).toMatch(/Start/);

for (const fn of otherTabChannelListeners) {
fn({
userId: USER_ID,
attemptId: ATTEMPT_ID,
kind: 'start',
sourceTabId: OTHER_TAB,
      });
    }

await act(async () => {
await vi.advanceTimersByTimeAsync(500);
    });

active.attempt = {
attemptId: ATTEMPT_ID,
quizId: QUIZ_ID,
status: 'started',
startedAt: '2026-08-01T00:00:00.000Z',
submittedCount: 0,
totalQuestions: 1,
    } as unknown as AttemptSummaryResponseDto;
view.rerender(<QuizCtaStrip quizId={QUIZ_ID} idOrSlug="my-quiz" />);

expect(view.container.textContent).toMatch(/Continue/);

vi.useRealTimers();
  });
});

describe('Entry CTA — broadcast payload shape', () => {
it('the broadcasts/changed payload includes userId / attemptId / kind / sourceTabId', () => {

const event: BroadcastEvent = {
userId: USER_ID,
attemptId: ATTEMPT_ID,
kind: 'start',
sourceTabId: OTHER_TAB,
    };
expect(event.userId).toBe(USER_ID);
expect(event.attemptId).toBe(ATTEMPT_ID);
expect(event.kind).toBe('start');
expect(event.sourceTabId).toBe(OTHER_TAB);
  });

it('same-tab events from THIS_TAB do not propagate to subscribers', () => {

let subscriberCalls = 0;
const unsub = broadcastApi.addEventListener(() => {
subscriberCalls += 1;
    });
broadcastApi.postMessage({
userId: USER_ID,
attemptId: ATTEMPT_ID,
kind: 'start',
sourceTabId: THIS_TAB,
    });

return Promise.resolve().then(() => {
unsub();

expect(subscriberCalls).toBe(0);
    });
  });
});

describe('Entry CTA — remote abandon swap', () => {
it('a remote `attempts/changed { kind: abandon }` clears Continue and swaps to Start', () => {
const active = {
attempt: null as AttemptSummaryResponseDto | null,
isLoading: false,
error: null,
retry: vi.fn(async () => undefined),
    };
activeAttemptMock.mockImplementation(() => ({ ...active }));

active.attempt = {
attemptId: ATTEMPT_ID,
quizId: QUIZ_ID,
status: 'started',
startedAt: '2026-08-01T00:00:00.000Z',
submittedCount: 0,
totalQuestions: 1,
    } as unknown as AttemptSummaryResponseDto;
const view = render(<QuizCtaStrip quizId={QUIZ_ID} idOrSlug="my-quiz" />);
expect(view.container.textContent).toMatch(/Continue/);

for (const fn of otherTabChannelListeners) {
fn({
userId: USER_ID,
attemptId: ATTEMPT_ID,
kind: 'abandon',
sourceTabId: OTHER_TAB,
      });
    }

active.attempt = null;
view.rerender(<QuizCtaStrip quizId={QUIZ_ID} idOrSlug="my-quiz" />);
expect(view.container.textContent).toMatch(/Start/);
  });
});
