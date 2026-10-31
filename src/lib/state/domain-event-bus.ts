import { logger } from '@/shared/log';

export type DomainEventKind =
  | 'USER_PROFILE_UPDATED'
  | 'QUIZ_ATTEMPT_STARTED'
  | 'QUIZ_ATTEMPT_COMPLETED'
  | 'FOLLOW_CHANGED'
  | 'BLOCKLIST_CHANGED'
  | 'NOTIFICATION_RECEIVED'
  | 'COIN_BALANCE_CHANGED'
  | 'AUTH_STATE_CHANGED';

interface BaseDomainEvent<K extends DomainEventKind> {
  kind: K;
  emittedAt: number;
}

export interface UserProfileUpdatedEvent
  extends BaseDomainEvent<'USER_PROFILE_UPDATED'> {
  userId: string;
  updateKind: 'me' | 'settings' | 'avatar' | 'preferences';
}

export interface QuizAttemptStartedEvent
  extends BaseDomainEvent<'QUIZ_ATTEMPT_STARTED'> {
  attemptId: string;
  quizId: string;
}

export interface QuizAttemptCompletedEvent
  extends BaseDomainEvent<'QUIZ_ATTEMPT_COMPLETED'> {
  attemptId: string;
  quizId: string;
}

export interface FollowChangedEvent extends BaseDomainEvent<'FOLLOW_CHANGED'> {
  targetUserId: string;
  actorUserId: string;
  isFollowing: boolean;
}

export interface BlocklistChangedEvent
  extends BaseDomainEvent<'BLOCKLIST_CHANGED'> {
  targetUserId: string;
  actorUserId: string;
  isBlocked: boolean;
}

export interface NotificationReceivedEvent
  extends BaseDomainEvent<'NOTIFICATION_RECEIVED'> {
  notificationId: string;
}

export interface CoinBalanceChangedEvent
  extends BaseDomainEvent<'COIN_BALANCE_CHANGED'> {
  balance: number;
  delta: number;
  reason: string;
}

export interface AuthStateChangedEvent
  extends BaseDomainEvent<'AUTH_STATE_CHANGED'> {
  isAuthenticated: boolean;
}

export type DomainEvent =
  | UserProfileUpdatedEvent
  | QuizAttemptStartedEvent
  | QuizAttemptCompletedEvent
  | FollowChangedEvent
  | BlocklistChangedEvent
  | NotificationReceivedEvent
  | CoinBalanceChangedEvent
  | AuthStateChangedEvent;

export type DomainEventListener<E extends DomainEvent = DomainEvent> = (
  event: E,
) => void;

type AnyListener = DomainEventListener<DomainEvent>;

interface DomainEventBus {
  on<K extends DomainEvent['kind']>(
    kind: K,
    listener: DomainEventListener<Extract<DomainEvent, { kind: K }>>,
  ): () => void;
  off<K extends DomainEvent['kind']>(
    kind: K,
    listener: DomainEventListener<Extract<DomainEvent, { kind: K }>>,
  ): void;
  emit(event: DomainEvent): void;
  clear(): void;
  listenerCount(kind: DomainEvent['kind']): number;
}

function createDomainEventBus(): DomainEventBus {
  const listeners = new Map<DomainEvent['kind'], Set<AnyListener>>();

  function ensureSet(kind: DomainEvent['kind']): Set<AnyListener> {
    let set = listeners.get(kind);
    if (set === undefined) {
      set = new Set<AnyListener>();
      listeners.set(kind, set);
    }
    return set;
  }

  function dispatch(event: DomainEvent): void {
    const set = listeners.get(event.kind);
    if (set === undefined) return;
    for (const listener of [...set]) {
      try {
        listener(event);
      } catch (err) {
        logger.error(
          'domain-event-bus',
          `listener for "${event.kind}" threw`,
          err,
        );
      }
    }
  }

  return {
    on(kind, listener) {
      const set = ensureSet(kind);
      set.add(listener as AnyListener);
      return () => {
        set.delete(listener as AnyListener);
      };
    },
    off(kind, listener) {
      const set = listeners.get(kind);
      if (set === undefined) return;
      set.delete(listener as AnyListener);
    },
    emit(event) {
      dispatch(event);
    },
    clear() {
      listeners.clear();
    },
    listenerCount(kind) {
      return listeners.get(kind)?.size ?? 0;
    },
  };
}

let busInstance: DomainEventBus | null = null;

export function getDomainEventBus(): DomainEventBus {
  if (busInstance === null) {
    busInstance = createDomainEventBus();
  }
  return busInstance;
}

export function resetDomainEventBusForTesting(): void {
  if (busInstance !== null) {
    busInstance.clear();
  }
  busInstance = null;
}

export function dispatchDomainEvent<E extends DomainEvent>(event: E): void {
  if (
    typeof event !== 'object' ||
    event === null ||
    typeof event.kind !== 'string'
  ) {
    logger.warn(
      'domain-event-bus',
      'dispatchDomainEvent: dropped malformed event',
    );
    return;
  }
  const stamped: E =
    typeof event.emittedAt === 'number'
      ? event
      : ({ ...event, emittedAt: Date.now() } as E);
  getDomainEventBus().emit(stamped);
}

export type { DomainEventBus };
