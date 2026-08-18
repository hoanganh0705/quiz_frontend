

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks/useReevaluateUserAchievements', () => ({
useReevaluateUserAchievements: vi.fn(),
}));

import { useReevaluateUserAchievements } from '../../hooks/useReevaluateUserAchievements';

import { ReevaluateRunningIndicator } from '../ReevaluateRunningIndicator';

function mockLifecycle(lifecycle: 'idle' | 'running' | 'completed' | 'failed') {
vi.mocked(useReevaluateUserAchievements).mockReturnValue({ lifecycle });
}

describe('TKT-7.8.D2(a) — ReevaluateRunningIndicator', () => {
beforeEach(() => {
vi.mocked(useReevaluateUserAchievements).mockReset();
  });

afterEach(() => vi.restoreAllMocks());

it('renders null when lifecycle is idle', () => {
mockLifecycle('idle');
render(<ReevaluateRunningIndicator userId="uid" />);
expect(
screen.queryByTestId('reevaluate-running-indicator'),
    ).not.toBeInTheDocument();
  });

it('renders null when lifecycle is completed', () => {
mockLifecycle('completed');
render(<ReevaluateRunningIndicator userId="uid" />);
expect(
screen.queryByTestId('reevaluate-running-indicator'),
    ).not.toBeInTheDocument();
  });

it('renders null when lifecycle is failed', () => {
mockLifecycle('failed');
render(<ReevaluateRunningIndicator userId="uid" />);
expect(
screen.queryByTestId('reevaluate-running-indicator'),
    ).not.toBeInTheDocument();
  });

it('renders spinner and copy when lifecycle is running', () => {
mockLifecycle('running');
render(<ReevaluateRunningIndicator userId="uid" />);

const indicator = screen.getByTestId('reevaluate-running-indicator');
expect(indicator).toBeInTheDocument();
expect(indicator).toHaveAttribute('role', 'status');
expect(indicator).toHaveAttribute('aria-live', 'polite');
expect(indicator).toHaveTextContent('Re-evaluation running…');
  });
});
