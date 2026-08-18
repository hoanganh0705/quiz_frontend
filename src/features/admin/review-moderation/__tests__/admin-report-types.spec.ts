

import { describe, expect, it } from 'vitest';

import {
REPORT_STATES,
REVIEW_REPORTS_PAGE_SIZE,
type ReportAction,
type ReportReason,
type ReportState,
assertReportStateExhaustive,
isReportAction,
isReportReason,
isReportState,
} from '../admin-report-types';

describe('admin-report-types', () => {
describe('REPORT_STATES', () => {
it('lists every documented state in the union', () => {
expect(Object.keys(REPORT_STATES).sort()).toEqual([
'actioned',
'dismissed',
'open',
'reviewed',
      ]);
    });
  });

describe('REVIEW_REPORTS_PAGE_SIZE', () => {
it('is the documented 20-row default', () => {
expect(REVIEW_REPORTS_PAGE_SIZE).toBe(20);
    });
  });

describe('isReportState', () => {
it('accepts every documented status', () => {
expect(isReportState('open')).toBe(true);
expect(isReportState('reviewed')).toBe(true);
expect(isReportState('dismissed')).toBe(true);
expect(isReportState('actioned')).toBe(true);
    });

it('rejects unknown strings', () => {
expect(isReportState('pending')).toBe(false);
expect(isReportState('resolved')).toBe(false);
expect(isReportState('unknown')).toBe(false);
expect(isReportState('')).toBe(false);
    });

it('rejects non-string inputs', () => {
expect(isReportState(null)).toBe(false);
expect(isReportState(undefined)).toBe(false);
expect(isReportState(42)).toBe(false);
expect(isReportState({})).toBe(false);
    });
  });

describe('isReportAction', () => {
it('accepts every documented action', () => {
expect(isReportAction('reviewed')).toBe(true);
expect(isReportAction('dismissed')).toBe(true);
expect(isReportAction('actioned')).toBe(true);
    });

it('rejects unknown strings', () => {
expect(isReportAction('hide_review')).toBe(false);
expect(isReportAction('delete_review')).toBe(false);
expect(isReportAction('mark_resolved')).toBe(false);
expect(isReportAction('')).toBe(false);
    });

it('rejects non-string inputs', () => {
expect(isReportAction(null)).toBe(false);
expect(isReportAction(undefined)).toBe(false);
expect(isReportAction(0)).toBe(false);
expect(isReportAction([])).toBe(false);
    });
  });

describe('isReportReason', () => {
it('accepts every documented reason', () => {
expect(isReportReason('spam')).toBe(true);
expect(isReportReason('harassment')).toBe(true);
expect(isReportReason('inappropriate_content')).toBe(true);
expect(isReportReason('misinformation')).toBe(true);
expect(isReportReason('other')).toBe(true);
    });

it('rejects unknown strings', () => {
expect(isReportReason('off-topic')).toBe(false);
expect(isReportReason('')).toBe(false);
    });

it('rejects non-string inputs', () => {
expect(isReportReason(null)).toBe(false);
expect(isReportReason(undefined)).toBe(false);
expect(isReportReason(7)).toBe(false);
    });
  });

describe('assertReportStateExhaustive', () => {
it('throws on non-ReportState inputs', () => {
expect(() =>
assertReportStateExhaustive('pending' as unknown as never),
      ).toThrowError(/Unreachable state/);
expect(() =>
assertReportStateExhaustive(null as unknown as never),
      ).toThrowError(/Unreachable state/);
    });
  });

describe('union coverage (compile-time lock)', () => {

it('REPORT_STATES values match the ReportState union', () => {
const states = Object.values(REPORT_STATES) as ReportState[];
const set = new Set(states);
expect(set.size).toBe(4);
expect(set.has('open')).toBe(true);
expect(set.has('reviewed')).toBe(true);
expect(set.has('dismissed')).toBe(true);
expect(set.has('actioned')).toBe(true);
    });

it('action whitelist covers every ReportAction member', () => {
const actions: ReportAction[] = ['reviewed', 'dismissed', 'actioned'];
expect(actions).toHaveLength(3);
for (const action of actions) {
expect(isReportAction(action)).toBe(true);
      }
    });

it('reason whitelist covers every ReportReason member', () => {
const reasons: ReportReason[] = [
'spam',
'harassment',
'inappropriate_content',
'misinformation',
'other',
      ];
expect(reasons).toHaveLength(5);
for (const reason of reasons) {
expect(isReportReason(reason)).toBe(true);
      }
    });
  });
});