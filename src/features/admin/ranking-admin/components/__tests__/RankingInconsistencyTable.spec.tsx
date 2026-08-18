

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RankingInconsistencyTable } from '../RankingInconsistencyTable';

describe('TKT-7.9.D4 — RankingInconsistencyTable', () => {
it('renders empty state when inconsistencies array is empty', () => {
render(<RankingInconsistencyTable inconsistencies={[]} />);

expect(screen.getByTestId('ranking-inconsistency-empty-state')).toBeInTheDocument();
expect(screen.getByText('No inconsistencies found. Rankings are consistent.')).toBeInTheDocument();
  });

it('renders skeleton rows when isLoading is true', () => {
render(<RankingInconsistencyTable inconsistencies={[]} isLoading />);

expect(screen.queryByTestId('ranking-inconsistency-empty-state')).not.toBeInTheDocument();
expect(screen.getAllByTestId('ranking-inconsistency-skeleton-row')).toHaveLength(3);
  });

it('renders inconsistency rows with all fields', () => {
const inconsistencies = [
{
userId: 'user-1',
field: 'totalXp',
expected: 1000,
actual: 950,
period: '2025-W01',
      },
    ];

render(<RankingInconsistencyTable inconsistencies={inconsistencies} />);

expect(screen.getByText('user-1')).toBeInTheDocument();
expect(screen.getByText('totalXp')).toBeInTheDocument();
expect(screen.getByText('1000')).toBeInTheDocument();
expect(screen.getByText('950')).toBeInTheDocument();
expect(screen.getByText('2025-W01')).toBeInTheDocument();
  });

it('renders multiple rows', () => {
const inconsistencies = [
{ userId: 'user-1', field: 'totalXp', expected: 1000, actual: 950, period: '2025-W01' },
{ userId: 'user-2', field: 'rank', expected: 5, actual: 3, period: '2025-W01' },
    ];

render(<RankingInconsistencyTable inconsistencies={inconsistencies} />);

expect(screen.getAllByTestId('ranking-inconsistency-row')).toHaveLength(2);
  });

it('renders empty state even when isLoading is false and array is empty', () => {
render(<RankingInconsistencyTable inconsistencies={[]} isLoading={false} />);

expect(screen.getByTestId('ranking-inconsistency-empty-state')).toBeInTheDocument();
  });
});
