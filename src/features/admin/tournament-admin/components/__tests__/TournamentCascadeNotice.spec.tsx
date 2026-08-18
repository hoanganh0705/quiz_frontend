

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TournamentCascadeNotice } from '../TournamentCascadeNotice';

import type { TournamentCascadeDto } from '../../admin-tournament-types';

function makeCascade(
overrides: Partial<TournamentCascadeDto> = {},
): TournamentCascadeDto {
return {
participants: 10,
rounds: 3,
leaderboards: 1,
...overrides,
  };
}

describe('TKT-7.7.D4 — TournamentCascadeNotice: cascade states', () => {
it('AC #1: renders a skeleton when isLoading=true', () => {
render(<TournamentCascadeNotice cascade={null} isLoading={true} />);

expect(
screen.getByTestId('tournament-cascade-notice-loading'),
    ).toBeInTheDocument();
expect(
screen.queryByTestId('tournament-cascade-notice'),
    ).not.toBeInTheDocument();
  });

it('AC #1: renders unavailable notice when cascade=null', () => {
render(<TournamentCascadeNotice cascade={null} isLoading={false} />);

expect(
screen.getByTestId('tournament-cascade-notice-unavailable'),
    ).toBeInTheDocument();
  });

it('AC #1: renders cascade counts when cascade is non-null', () => {
render(<TournamentCascadeNotice cascade={makeCascade()} isLoading={false} />);

expect(
screen.getByTestId('tournament-cascade-notice'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-cascade-notice-participants'),
    ).toHaveTextContent('10');
expect(
screen.getByTestId('tournament-cascade-notice-rounds'),
    ).toHaveTextContent('3');
expect(
screen.getByTestId('tournament-cascade-notice-leaderboards'),
    ).toHaveTextContent('1');
  });

it('AC #1: renders "—" when counts are null', () => {
render(
<TournamentCascadeNotice
cascade={makeCascade({ participants: null, rounds: null, leaderboards: null })}
isLoading={false}
      />,
    );

const counts = screen.getAllByTestId('tournament-cascade-notice-count');
expect(counts[0]).toHaveTextContent('—');
expect(counts[1]).toHaveTextContent('—');
expect(counts[2]).toHaveTextContent('—');
  });

it('AC #1: appends "+" suffix when hasMoreParticipants=true', () => {
render(
<TournamentCascadeNotice
cascade={makeCascade({ hasMoreParticipants: true })}
isLoading={false}
      />,
    );

expect(
screen.getByTestId('tournament-cascade-notice-participants'),
    ).toHaveTextContent('10+');
  });
});
