

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RankingCrossUserImpactWarning } from '../RankingCrossUserImpactWarning';

describe('TKT-7.9.D3 — RankingCrossUserImpactWarning', () => {
it('renders the irreversibility notice', () => {
render(<RankingCrossUserImpactWarning />);

expect(screen.getByTestId('ranking-cross-user-impact-warning')).toBeInTheDocument();
expect(screen.getByText(/Cross-user impact/)).toBeInTheDocument();
  });

it('renders affected user count when provided', () => {
render(<RankingCrossUserImpactWarning affectedUserCount={100} />);

expect(screen.getByTestId('ranking-affected-user-count')).toBeInTheDocument();
expect(screen.getByText(/100/)).toBeInTheDocument();
expect(screen.getByText(/This action affects/)).toBeInTheDocument();
  });

it('renders singular "user" when affectedUserCount is 1', () => {
render(<RankingCrossUserImpactWarning affectedUserCount={1} />);

const affectedCountEl = screen.getByTestId('ranking-affected-user-count');
expect(affectedCountEl).toHaveTextContent(/user\.$/);
expect(affectedCountEl).toHaveTextContent('1');
  });

it('renders without affected user count when null', () => {
render(<RankingCrossUserImpactWarning affectedUserCount={null} />);

expect(screen.queryByTestId('ranking-affected-user-count')).not.toBeInTheDocument();
  });

it('renders without affected user count when undefined', () => {
render(<RankingCrossUserImpactWarning />);

expect(screen.queryByTestId('ranking-affected-user-count')).not.toBeInTheDocument();
  });

it('has no close or dismiss button', () => {
render(<RankingCrossUserImpactWarning affectedUserCount={50} />);

const closeButtons = screen.queryAllByRole('button');
expect(closeButtons).toHaveLength(0);
  });
});
