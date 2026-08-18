

import { createBroadcastChannel } from '@/lib/broadcast';

export const ATTEMPTS_CHANNEL_NAME = 'attempts';

export type AttemptEventType = 'attempts/changed';

export type AttemptChangeKind =
| 'start'
  | 'submit'
  | 'withdraw'
  | 'abandon'
  | 'complete';

export interface BaseAttemptEvent {
type: AttemptEventType;

tabId: string;

timestamp: number;
}

export interface AttemptsChangedEvent extends BaseAttemptEvent {
type: 'attempts/changed';

userId: string;

attemptId: string;

kind: AttemptChangeKind;
}

export type AttemptEvent = AttemptsChangedEvent;

const ATTEMPT_VALID_KINDS = new Set<AttemptChangeKind>([
'start',
'submit',
'withdraw',
'abandon',
'complete',
]);

const attemptsChannel = createBroadcastChannel<AttemptEvent>(ATTEMPTS_CHANNEL_NAME, {
validate: (data): AttemptEvent | null => {
if (typeof data !== 'object' || data === null) return null;
const d = data as Partial<AttemptsChangedEvent>;
if (d.type !== 'attempts/changed') return null;
if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
if (typeof d.userId !== 'string' || d.userId.length === 0) return null;
if (typeof d.attemptId !== 'string' || d.attemptId.length === 0) return null;
if (typeof d.kind !== 'string' || !ATTEMPT_VALID_KINDS.has(d.kind as AttemptChangeKind)) {
return null;
    }
return d as AttemptEvent;
  },
});

export function closeAttemptsChannel(): void {
attemptsChannel.closeChannel();
}

export function getAttemptsChannel(): BroadcastChannel | null {
return attemptsChannel.getChannel();
}

export function subscribeToAttemptEvents(
handler: (event: AttemptEvent) => void,
): () => void {
return attemptsChannel.subscribe(handler);
}

export function broadcastAttemptsChanged(params: {
userId: string;
attemptId: string;
kind: AttemptChangeKind;
}): void {

attemptsChannel.ensureChannel();
if (
!params.userId ||
typeof params.userId !== 'string' ||
!params.attemptId ||
typeof params.attemptId !== 'string' ||
!params.kind
  ) {
return;
  }
attemptsChannel.publish({
type: 'attempts/changed',
userId: params.userId,
attemptId: params.attemptId,
kind: params.kind,
  });
}
