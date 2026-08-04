/**
 * `TournamentCapacityIndicator.spec.tsx` — integration tests for the capacity indicator.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.3 — Tournament registration and participant-state mutations.
 * Source ticket: TKT-5.3.G2.
 *
 * Tests cover:
 * - Partial capacity: renders count with progress bar
 * - Full tournament: renders "Full" badge
 * - No cap: renders count without fraction
 * - Missing data: renders nothing
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TournamentCapacityIndicator } from '@/features/tournaments/components/shared/TournamentCapacityIndicator';

describe('TournamentCapacityIndicator', () => {
  describe('missing data', () => {
    it('renders nothing when currentParticipants is null', () => {
      const { container } = render(
        <TournamentCapacityIndicator currentParticipants={null} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when currentParticipants is undefined', () => {
      const { container } = render(
        <TournamentCapacityIndicator currentParticipants={undefined} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('partial capacity', () => {
    it('renders "X / Y participants" when maxParticipants is set', () => {
      render(
        <TournamentCapacityIndicator
          currentParticipants={50}
          maxParticipants={100}
        />,
      );

      expect(screen.getByText('50 / 100')).toBeInTheDocument();
    });

    it('renders progress bar', () => {
      render(
        <TournamentCapacityIndicator
          currentParticipants={50}
          maxParticipants={100}
        />,
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('progress bar shows correct percentage', () => {
      render(
        <TournamentCapacityIndicator
          currentParticipants={75}
          maxParticipants={100}
        />,
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('full tournament', () => {
    it('renders "Full" badge when at capacity', () => {
      render(
        <TournamentCapacityIndicator
          currentParticipants={100}
          maxParticipants={100}
        />,
      );

      expect(screen.getByTestId('tournament-capacity-indicator-full-badge')).toBeInTheDocument();
      expect(screen.getByText('Full')).toBeInTheDocument();
    });

    it('renders "Full" badge when over capacity', () => {
      render(
        <TournamentCapacityIndicator
          currentParticipants={105}
          maxParticipants={100}
        />,
      );

      expect(screen.getByText('Full')).toBeInTheDocument();
    });
  });

  describe('no cap', () => {
    it('renders "X participants" without fraction when maxParticipants is null', () => {
      render(
        <TournamentCapacityIndicator currentParticipants={50} maxParticipants={null} />,
      );

      expect(screen.getByText('50 participants')).toBeInTheDocument();
    });

    it('renders "X participants" without fraction when maxParticipants is undefined', () => {
      render(
        <TournamentCapacityIndicator currentParticipants={50} maxParticipants={undefined} />,
      );

      expect(screen.getByText('50 participants')).toBeInTheDocument();
    });

    it('renders singular "participant" for count of 1', () => {
      render(
        <TournamentCapacityIndicator currentParticipants={1} maxParticipants={null} />,
      );

      expect(screen.getByText('1 participant')).toBeInTheDocument();
    });

    it('renders plural "participants" for count > 1', () => {
      render(
        <TournamentCapacityIndicator currentParticipants={5} maxParticipants={null} />,
      );

      expect(screen.getByText('5 participants')).toBeInTheDocument();
    });
  });

  describe('data attributes', () => {
    it('has data-current attribute', () => {
      render(
        <TournamentCapacityIndicator currentParticipants={50} maxParticipants={100} />,
      );

      const indicator = screen.getByTestId('tournament-capacity-indicator');
      expect(indicator).toHaveAttribute('data-current', '50');
    });

    it('has data-max attribute with unlimited', () => {
      render(
        <TournamentCapacityIndicator currentParticipants={50} maxParticipants={null} />,
      );

      const indicator = screen.getByTestId('tournament-capacity-indicator');
      expect(indicator).toHaveAttribute('data-max', 'unlimited');
    });

    it('has data-full attribute when full', () => {
      render(
        <TournamentCapacityIndicator currentParticipants={100} maxParticipants={100} />,
      );

      const indicator = screen.getByTestId('tournament-capacity-indicator');
      expect(indicator).toHaveAttribute('data-full', 'true');
    });
  });
});
