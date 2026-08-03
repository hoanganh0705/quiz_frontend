/**
 * phase4ConfirmCopyMap — Phase 4 destructive-action → ConfirmKind map.
 *
 * Source epic:   Epic 4.1.
 * Source ticket: TKT-4.1.D4.
 */
import { describe, expect, it } from 'vitest';

import {
  PHASE4_ACTION_NAMES,
  PHASE4_CONFIRM_KIND,
  actionsForKind,
  getConfirmKind,
  type Phase4Action,
} from './phase4ConfirmCopyMap';
import type { ConfirmKind } from '@/components/primitives/ConfirmDialog/confirm-copy';

describe('phase4ConfirmCopyMap', () => {
  it('PHASE4_ACTION_NAMES lists every Phase 4 destructive action', () => {
    // The TKT-4.1.D4 ticket requires at least 5 entries.
    expect(PHASE4_ACTION_NAMES.length).toBeGreaterThanOrEqual(5);
    // Spot-check the 5 the ticket body calls out.
    expect(PHASE4_ACTION_NAMES).toContain('bookmark.collection.delete');
    expect(PHASE4_ACTION_NAMES).toContain('attempt.submit-and-complete');
    expect(PHASE4_ACTION_NAMES).toContain('collection.bulk-remove');
    expect(PHASE4_ACTION_NAMES).toContain('quiz.publish');
    expect(PHASE4_ACTION_NAMES).toContain('review.delete');
  });

  it('every Phase4Action has a kind assigned (exhaustive map)', () => {
    // Iterating via the action list (not the keys of the Record)
    // ensures we catch the case where a new action is added to the
    // union without being assigned a kind.
    const seenKinds = new Set<ConfirmKind>();
    for (const action of PHASE4_ACTION_NAMES) {
      const kind = PHASE4_CONFIRM_KIND[action];
      expect(kind).toBeTruthy();
      seenKinds.add(kind);
    }
    // Sanity: the map covers more than one variant.
    expect(seenKinds.size).toBeGreaterThan(1);
  });

  it('bookmark.collection.delete is destructive-permanent (master plan line 73: hard-delete)', () => {
    expect(PHASE4_CONFIRM_KIND['bookmark.collection.delete']).toBe(
      'destructive-permanent',
    );
  });

  it('attempt.submit-and-complete is state-changing', () => {
    expect(PHASE4_CONFIRM_KIND['attempt.submit-and-complete']).toBe(
      'state-changing',
    );
  });

  it('collection.bulk-remove is destructive-idempotent', () => {
    expect(PHASE4_CONFIRM_KIND['collection.bulk-remove']).toBe(
      'destructive-idempotent',
    );
  });

  it('quiz.publish is state-changing', () => {
    expect(PHASE4_CONFIRM_KIND['quiz.publish']).toBe('state-changing');
  });

  it('review.delete is destructive-permanent', () => {
    expect(PHASE4_CONFIRM_KIND['review.delete']).toBe('destructive-permanent');
  });

  it('account.delete is typed-confirm', () => {
    expect(PHASE4_CONFIRM_KIND['account.delete']).toBe('typed-confirm');
  });

  it('getConfirmKind returns the mapped kind for known actions', () => {
    expect(getConfirmKind('quiz.publish')).toBe('state-changing');
    expect(getConfirmKind('account.delete')).toBe('typed-confirm');
    expect(getConfirmKind('collection.bulk-remove')).toBe('destructive-idempotent');
  });

  it('getConfirmKind falls back to destructive-permanent for unknown actions', () => {
    expect(getConfirmKind('not.a.real.action')).toBe('destructive-permanent');
    expect(getConfirmKind('')).toBe('destructive-permanent');
  });

  it('actionsForKind returns the reverse mapping', () => {
    const permanentActions = actionsForKind('destructive-permanent');
    expect(permanentActions).toContain('bookmark.collection.delete');
    expect(permanentActions).toContain('review.delete');
    expect(permanentActions).toContain('quiz.version.delete');

    const bulkActions = actionsForKind('destructive-idempotent');
    expect(bulkActions).toContain('collection.bulk-remove');

    const typedActions = actionsForKind('typed-confirm');
    expect(typedActions).toContain('account.delete');
  });

  it('every Phase4Action is well-typed against the map (compile-time)', () => {
    // Type-level sanity: assigning every PHASE4_ACTION_NAMES entry to a
    // `Phase4Action` typed variable must compile. The cast is for
    // tsc; the runtime check is the size assertion.
    const all: Phase4Action[] = [...PHASE4_ACTION_NAMES];
    expect(all.length).toBe(PHASE4_ACTION_NAMES.length);
  });

  it('PHASE4_CONFIRM_KIND is frozen (immutability)', () => {
    expect(Object.isFrozen(PHASE4_CONFIRM_KIND)).toBe(true);
  });
});
