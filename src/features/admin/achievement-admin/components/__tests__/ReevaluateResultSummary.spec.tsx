/**
 * `ReevaluateResultSummary` unit tests.
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.D2 (part b).
 *
 * Coverage map (TKT-7.8.D2 AC #2):
 *
 *   AC #2 — renders null in idle/running/failed; renders delta table in completed.
 *   AC #3 — typed-confirm string never in rendered table.
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks/useReevaluateUserAchievements', () => ({
  useReevaluateUserAchievements: vi.fn(),
}));

import { useReevaluateUserAchievements } from '../../hooks/useReevaluateUserAchievements';

import { ReevaluateResultSummary } from '../ReevaluateResultSummary';

function mockCompleted(audit: {
  before: unknown;
  after: unknown;
}) {
  vi.mocked(useReevaluateUserAchievements).mockReturnValue({
    lifecycle: 'completed',
    audit,
  });
}

describe('TKT-7.8.D2(b) — ReevaluateResultSummary', () => {
  beforeEach(() => {
    vi.mocked(useReevaluateUserAchievements).mockReset();
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders null when lifecycle is idle', () => {
    vi.mocked(useReevaluateUserAchievements).mockReturnValue({
      lifecycle: 'idle',
      audit: { before: null, after: null },
    });
    render(<ReevaluateResultSummary userId="uid" />);
    expect(
      screen.queryByTestId('reevaluate-result-summary'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('reevaluate-completed-notice'),
    ).not.toBeInTheDocument();
  });

  it('renders null when lifecycle is running', () => {
    vi.mocked(useReevaluateUserAchievements).mockReturnValue({
      lifecycle: 'running',
      audit: { before: null, after: null },
    });
    render(<ReevaluateResultSummary userId="uid" />);
    expect(
      screen.queryByTestId('reevaluate-result-summary'),
    ).not.toBeInTheDocument();
  });

  it('renders null when lifecycle is failed', () => {
    vi.mocked(useReevaluateUserAchievements).mockReturnValue({
      lifecycle: 'failed',
      audit: { before: null, after: null },
    });
    render(<ReevaluateResultSummary userId="uid" />);
    expect(
      screen.queryByTestId('reevaluate-result-summary'),
    ).not.toBeInTheDocument();
  });

  it('renders notice without table when audit.after is null', () => {
    mockCompleted({ before: null, after: null });
    render(<ReevaluateResultSummary userId="uid" />);
    expect(
      screen.getByTestId('reevaluate-completed-notice'),
    ).toBeInTheDocument();
  });

  it('renders result summary card when audit.after is present', () => {
    mockCompleted({
      before: null,
      after: { userId: 'uid', totalBadgesAwarded: 3 } as Record<
        string,
        unknown
      >,
    });
    render(<ReevaluateResultSummary userId="uid" />);

    const card = screen.getByTestId('reevaluate-result-summary');
    expect(card).toBeInTheDocument();
    expect(screen.getByTestId('reevaluate-result-copy')).toHaveTextContent(
      '3 badges awarded',
    );
  });

  it('renders zero awarded message when totalBadgesAwarded is 0', () => {
    mockCompleted({
      before: null,
      after: { userId: 'uid', totalBadgesAwarded: 0 } as Record<
        string,
        unknown
      >,
    });
    render(<ReevaluateResultSummary userId="uid" />);
    expect(screen.getByTestId('reevaluate-result-copy')).toHaveTextContent(
      'No new badges awarded',
    );
  });

  it('AC #4 — typed-confirm string never in the rendered output', () => {
    mockCompleted({
      before: null,
      after: { userId: 'uid', totalBadgesAwarded: 1 } as Record<
        string,
        unknown
      >,
    });
    const { container } = render(<ReevaluateResultSummary userId="uid" />);
    expect(container.textContent).not.toContain('REVOKE BADGE');
  });
});
