import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LandingPage } from '../pages/LandingPage';
import { ProgressPage } from '../pages/ProgressPage';
import { ConceptContext } from '../components/ConceptContext';
import { Problem, UserStats, ProblemRecommendation, SpacedReviewRecord, Concept } from '../types';
import { PROBLEMS } from '../data/problems';
import { CONCEPTS } from '../data/concepts';

describe('Milestone 3: UI Integration & User Actions', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const baseStats: UserStats = {
    problemsPracticed: 2,
    conceptsReviewed: 1,
    currentStreak: 2,
    weakAreas: [
      {
        topic: 'Two Pointers',
        reason: 'Level 3+ hints requested in 2 sessions',
        urgency: 'High'
      }
    ],
    recentlyStudied: [],
    recommendedNext: []
  };

  const sampleRecommendations: ProblemRecommendation[] = [
    {
      problemId: 'three-sum',
      problem: PROBLEMS.find(p => p.id === 'three-sum')!,
      category: 'weak_topic',
      topic: 'Two Pointers',
      reason: 'Target your diagnostic weakness in Two Pointers.',
      evidence: 'Observed level 3+ hints in ≥ 50% of recorded Two Pointers sessions.',
      priority: 1
    },
    {
      problemId: 'longest-substring-without-repeating-characters',
      problem: PROBLEMS.find(p => p.id === 'longest-substring-without-repeating-characters')!,
      category: 'concept_bridge',
      conceptId: 'sliding-window',
      topic: 'Sliding Window',
      reason: 'Bridge from Sliding Window to hands-on problem solving.',
      evidence: 'Hands-on practice following concept quiz.',
      priority: 2
    }
  ];

  const sampleDueReviews = [
    {
      problem: PROBLEMS.find(p => p.id === 'two-sum')!,
      review: {
        problemId: 'two-sum',
        completionDate: '2026-10-18T10:00:00.000Z',
        stage: 0,
        intervalDays: 1,
        nextReviewDate: '2026-10-19T10:00:00.000Z',
        reviewCount: 0
      },
      daysOverdue: 1
    }
  ];

  describe('LandingPage Recommendations & Due Reviews', () => {
    it('renders due reviews with interval badge, overdue time, and action buttons', () => {
      const onStartMode = vi.fn();
      const onNavigate = vi.fn();
      const onCompleteReview = vi.fn();

      render(
        <LandingPage
          onStartMode={onStartMode}
          onNavigate={onNavigate}
          stats={baseStats}
          recommendations={sampleRecommendations}
          dueReviews={sampleDueReviews}
          onCompleteReview={onCompleteReview}
        />
      );

      // Verify Due for Spaced Review section
      expect(screen.getByText('Due for Spaced Review')).toBeDefined();
      expect(screen.getByText('1 problem ready for review')).toBeDefined();
      expect(screen.getByText('Two Sum')).toBeDefined();
      expect(screen.getByText('1d review')).toBeDefined();
      expect(screen.getByText('1 day overdue')).toBeDefined();

      // Click Review button
      const reviewBtn = screen.getByRole('button', { name: /Review/i });
      fireEvent.click(reviewBtn);
      expect(onStartMode).toHaveBeenCalledWith('problem', 'two-sum');

      // Click Mark Done button (explicit completion)
      const markDoneBtn = screen.getByRole('button', { name: /Mark Done/i });
      fireEvent.click(markDoneBtn);
      expect(onCompleteReview).toHaveBeenCalledWith('two-sum');
    });

    it('renders truthful empty state when no spaced reviews are due', () => {
      render(
        <LandingPage
          onStartMode={vi.fn()}
          onNavigate={vi.fn()}
          stats={baseStats}
          recommendations={sampleRecommendations}
          dueReviews={[]}
        />
      );

      expect(screen.getByText('No reviews due right now.')).toBeDefined();
      expect(screen.getByText(/1d → 3d → 7d → 14d → 30d/)).toBeDefined();
    });

    it('renders adaptive problem recommendations with category badges and evidence', () => {
      const onStartMode = vi.fn();

      render(
        <LandingPage
          onStartMode={onStartMode}
          onNavigate={vi.fn()}
          stats={baseStats}
          recommendations={sampleRecommendations}
        />
      );

      expect(screen.getByText('3Sum')).toBeDefined();
      expect(screen.getByText('Needs Practice')).toBeDefined();
      expect(screen.getByText('Target your diagnostic weakness in Two Pointers.')).toBeDefined();

      expect(screen.getByText('Longest Substring Without Repeating Characters')).toBeDefined();
      expect(screen.getByText('Concept Bridge')).toBeDefined();

      // Click card to launch problem mode
      const card = screen.getByText('3Sum').closest('.cursor-pointer');
      expect(card).toBeDefined();
      fireEvent.click(card!);
      expect(onStartMode).toHaveBeenCalledWith('problem', 'three-sum');
    });

    it('does not mutate localStorage simply by displaying recommendations (read-only)', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      render(
        <LandingPage
          onStartMode={vi.fn()}
          onNavigate={vi.fn()}
          stats={baseStats}
          recommendations={sampleRecommendations}
          dueReviews={sampleDueReviews}
        />
      );

      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });

  describe('ConceptContext Concept-to-Problem Bridge', () => {
    it('displays Concept Practice Bridge card for concepts with verified problem mappings', () => {
      const concept = CONCEPTS.find(c => c.id === 'two-pointers')!;
      const onSelectProblem = vi.fn();

      render(
        <ConceptContext
          currentConcept={concept}
          allConcepts={CONCEPTS}
          onSelectConcept={vi.fn()}
          allProblems={PROBLEMS}
          onSelectProblem={onSelectProblem}
        />
      );

      expect(screen.getByText('Concept Practice Bridge')).toBeDefined();
      const practiceBtn = screen.getByRole('button', { name: /Practice in Problem Mode/i });
      expect(practiceBtn).toBeDefined();

      fireEvent.click(practiceBtn);
      expect(onSelectProblem).toHaveBeenCalled();
    });

    it('in quiz tab, presents practice problem with explicit disclaimer that recall does not equate to mastery', () => {
      const concept = CONCEPTS.find(c => c.id === 'two-pointers')!;
      const onSelectProblem = vi.fn();

      render(
        <ConceptContext
          currentConcept={concept}
          allConcepts={CONCEPTS}
          onSelectConcept={vi.fn()}
          allProblems={PROBLEMS}
          onSelectProblem={onSelectProblem}
        />
      );

      // Switch to Quiz tab
      const quizTab = screen.getByRole('button', { name: /Practice Quiz/i });
      fireEvent.click(quizTab);

      // Select an option and verify answer
      const firstOption = screen.getAllByRole('button').find(b => b.textContent?.startsWith('A'));
      expect(firstOption).toBeDefined();
      fireEvent.click(firstOption!);

      const verifyBtn = screen.getByRole('button', { name: /Verify Answer/i });
      fireEvent.click(verifyBtn);

      // Bridge problem should appear with educational disclaimer
      expect(screen.getByText('Recommended Practice Problem')).toBeDefined();
      expect(screen.getByText(/checkpoint recall alone does not equate to complete mastery|Reinforce what you've learned through hands-on implementation/)).toBeDefined();
    });
  });

  describe('ProgressPage Spaced Retention Schedule', () => {
    it('renders spaced retention schedule with active stages and review status', () => {
      const reviews = new Map<string, SpacedReviewRecord>([
        [
          'two-sum',
          {
            problemId: 'two-sum',
            completionDate: '2026-10-17T10:00:00.000Z',
            stage: 0,
            intervalDays: 1,
            nextReviewDate: '2026-10-18T10:00:00.000Z',
            reviewCount: 0
          }
        ],
        [
          'three-sum',
          {
            problemId: 'three-sum',
            completionDate: '2026-10-18T10:00:00.000Z',
            stage: 1,
            intervalDays: 3,
            nextReviewDate: '2026-10-21T10:00:00.000Z',
            reviewCount: 1
          }
        ]
      ]);

      const onCompleteReview = vi.fn();
      const onNavigateToTopic = vi.fn();

      render(
        <ProgressPage
          stats={baseStats}
          onNavigateToTopic={onNavigateToTopic}
          reviews={reviews}
          allProblems={PROBLEMS}
          onCompleteReview={onCompleteReview}
          recommendations={sampleRecommendations}
        />
      );

      expect(screen.getByText('Spaced Review Schedule & Retention')).toBeDefined();
      expect(screen.getByText('Stage 1 (1d)')).toBeDefined();
      expect(screen.getByText('Stage 2 (3d)')).toBeDefined();

      // Click Mark Done
      const markDoneBtn = screen.getByRole('button', { name: /Mark Done/i });
      fireEvent.click(markDoneBtn);
      expect(onCompleteReview).toHaveBeenCalledWith('two-sum');
    });
  });
});
