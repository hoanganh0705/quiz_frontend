

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RankingCooldownNotice } from '../RankingCooldownNotice';

beforeEach(() => {
vi.useFakeTimers();
});

afterEach(() => {
vi.restoreAllMocks();
vi.useRealTimers();
});

describe('TKT-7.9.D2 — RankingCooldownNotice', () => {
it('renders nothing when cooldownRemaining is null', () => {
render(<RankingCooldownNotice cooldownRemaining={null} />);
expect(screen.queryByTestId('ranking-cooldown-notice')).not.toBeInTheDocument();
  });

it('renders countdown text for seconds only (under 60)', () => {
render(<RankingCooldownNotice cooldownRemaining={30} />);

expect(screen.getByTestId('ranking-cooldown-notice')).toBeInTheDocument();
expect(screen.getByText(/30s/)).toBeInTheDocument();
  });

it('renders countdown text for minutes and seconds', () => {
render(<RankingCooldownNotice cooldownRemaining={90} />);

expect(screen.getByTestId('ranking-cooldown-notice')).toBeInTheDocument();
expect(screen.getByText(/1m 30s/)).toBeInTheDocument();
  });

it('renders countdown text for exact minutes', () => {
render(<RankingCooldownNotice cooldownRemaining={120} />);

expect(screen.getByTestId('ranking-cooldown-notice')).toBeInTheDocument();
expect(screen.getByText(/2m/)).toBeInTheDocument();
  });

it('countdown ticks down when prop changes', async () => {
const { rerender } = render(<RankingCooldownNotice cooldownRemaining={3} />);

expect(screen.getByTestId('ranking-cooldown-countdown')).toHaveTextContent('3s');

await act(async () => {
vi.advanceTimersByTime(1000);
    });
rerender(<RankingCooldownNotice cooldownRemaining={2} />);
expect(screen.getByTestId('ranking-cooldown-countdown')).toHaveTextContent('2s');

await act(async () => {
vi.advanceTimersByTime(1000);
    });
rerender(<RankingCooldownNotice cooldownRemaining={1} />);
expect(screen.getByTestId('ranking-cooldown-countdown')).toHaveTextContent('1s');

await act(async () => {
vi.advanceTimersByTime(1000);
    });
rerender(<RankingCooldownNotice cooldownRemaining={0} />);
expect(screen.getByTestId('ranking-cooldown-countdown')).toHaveTextContent('0s');
  });

it('renders the correct copy with full text', () => {
render(<RankingCooldownNotice cooldownRemaining={60} />);

expect(screen.getByText(/Cooldown active/)).toBeInTheDocument();
expect(screen.getByText(/retry in/)).toBeInTheDocument();
  });
});
