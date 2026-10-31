import type { ApolloCache } from '@apollo/client';

import {
  dispatchDomainEvent,
  type DomainEvent,
} from '@/lib/state/domain-event-bus';

export type ApolloUpdateHandoff<E extends DomainEvent> = (event: E) => void;

export interface ApolloHandoffOptions<E extends DomainEvent> {
  cache: ApolloCache;
  event: E;
}

export function handoffApolloUpdate<E extends DomainEvent>(
  options: ApolloHandoffOptions<E>,
): void {
  const { event } = options;
  dispatchDomainEvent(event);
}
