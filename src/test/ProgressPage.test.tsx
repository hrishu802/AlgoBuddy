import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ProgressPage } from '../pages/ProgressPage';
import { UserStats } from '../types';

describe('ProgressPage Component — Truthful Dashboard & Explainable States', () => {
  const onNavigateToTopic = vi.fn();

  it('renders truthful empty state when user has no recorded activity', () => {
    const emptyStats: UserStats = {
      problemsPracticed: 0,
      conceptsReviewed: 0,
      currentStreak: 0,
      weakAreas: [],
      recentlyStudied: [],
      recommendedNext: [],
      hintReliance: {
        averageLevel: null,
        evaluatedSessions: 0,
        label: '—'
      },
      difficultyBreakdown: { easy: 0, medium: 0, hard: 0 }
    };

    render(<ProgressPage stats={emptyStats} onNavigateToTopic={onNavigateToTopic} />);

    // Problems completed card
    expect(screen.getByText('Problems Completed')).toBeDefined();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('(Self-reported)')).toBeDefined();
    expect(screen.getByText('No completed problems yet')).toBeDefined();

    // Hint reliance
    expect(screen.getByText('—')).toBeDefined();
    expect(screen.getByText('Available after completing mentor sessions with hint tracking')).toBeDefined();

    // Empty weak areas
    expect(screen.getByText('No problem sessions recorded yet.')).toBeDefined();
    expect(screen.getByText('Solve problems and consult the mentor to generate diagnostic pattern insights.')).toBeDefined();
  });

  it('distinguishes insufficient practice data from empty and weak states', () => {
    const partialStats: UserStats = {
      problemsPracticed: 1,
      conceptsReviewed: 1,
      currentStreak: 1,
      weakAreas: [], // Less than 3 sessions for any topic
      recentlyStudied: [],
      recommendedNext: [],
      hintReliance: {
        averageLevel: 1,
        evaluatedSessions: 1,
        label: 'Lvl 1'
      },
      difficultyBreakdown: { easy: 1, medium: 0, hard: 0 }
    };

    render(<ProgressPage stats={partialStats} onNavigateToTopic={onNavigateToTopic} />);

    expect(screen.getByText('Not enough practice data to identify patterns.')).toBeDefined();
    expect(screen.getByText(/AlgoBuddy requires at least 3 recorded sessions/)).toBeDefined();
  });

  it('renders explainable weak area cards with evidence when threshold is met', () => {
    const statsWithWeakness: UserStats = {
      problemsPracticed: 3,
      conceptsReviewed: 2,
      currentStreak: 3,
      weakAreas: [
        {
          topic: 'Dynamic Programming',
          urgency: 'High',
          reason: 'Dynamic Programming may need more practice: across 3 recorded sessions, you requested level 3+ hints in 2 sessions.'
        }
      ],
      recentlyStudied: [
        {
          id: 'p1',
          type: 'problem',
          name: 'Climbing Stairs',
          date: 'Today',
          difficulty: 'Easy'
        }
      ],
      recommendedNext: [
        {
          id: 'p2',
          type: 'problem',
          name: 'Coin Change',
          tag: 'Dynamic Programming',
          reason: 'Strengthen pattern mastery in Dynamic Programming.',
          mode: 'problem'
        }
      ],
      hintReliance: {
        averageLevel: 3.3,
        evaluatedSessions: 3,
        label: 'Lvl 3.3'
      },
      difficultyBreakdown: { easy: 2, medium: 1, hard: 0 }
    };

    render(<ProgressPage stats={statsWithWeakness} onNavigateToTopic={onNavigateToTopic} />);

    // Renders genuine problem breakdown
    expect(screen.getByText('2 Easy')).toBeDefined();
    expect(screen.getByText('1 Med')).toBeDefined();
    expect(screen.getByText('0 Hard')).toBeDefined();

    // Renders genuine hint reliance
    expect(screen.getByText('Lvl 3.3')).toBeDefined();
    expect(screen.getByText('Average hint depth across 3 evaluated sessions')).toBeDefined();

    // Renders explainable weak area card
    expect(screen.getAllByText('Dynamic Programming').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('High Urgency')).toBeDefined();
    expect(
      screen.getByText(
        'Dynamic Programming may need more practice: across 3 recorded sessions, you requested level 3+ hints in 2 sessions.'
      )
    ).toBeDefined();
    expect(screen.getByText('Evidence: Observed level 3+ hint requests in ≥ 50% of sessions.')).toBeDefined();
  });
});
