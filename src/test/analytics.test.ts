import { describe, it, expect } from 'vitest';
import {
  computeUserStats,
  calculateStreak,
  detectTopicWeaknesses,
  hintLevelToDepth,
  toLocalDateString,
  MIN_EVALUATION_SESSIONS
} from '../services/analytics';
import { LearningEvent, Problem, Concept } from '../types';
import { PROBLEMS } from '../data/problems';
import { CONCEPTS } from '../data/concepts';

describe('Deterministic Analytics & Explainable Weakness Detection', () => {
  const dummyProblem1: Problem = {
    ...PROBLEMS[0],
    id: 'test-prob-1',
    title: 'Test Problem 1',
    difficulty: 'Easy',
    tags: ['Array', 'Two Pointers'],
    category: 'Arrays & Hashing'
  };

  const dummyProblem2: Problem = {
    ...PROBLEMS[1],
    id: 'test-prob-2',
    title: 'Test Problem 2',
    difficulty: 'Medium',
    tags: ['Dynamic Programming'],
    category: 'Dynamic Programming'
  };

  const dummyProblem3: Problem = {
    ...PROBLEMS[2],
    id: 'test-prob-3',
    title: 'Test Problem 3',
    difficulty: 'Hard',
    tags: ['Dynamic Programming'],
    category: 'Dynamic Programming'
  };

  const dummyProblem4: Problem = {
    ...PROBLEMS[3],
    id: 'test-prob-4',
    title: 'Test Problem 4',
    difficulty: 'Medium',
    tags: ['Dynamic Programming'],
    category: 'Dynamic Programming'
  };

  const dummyProblems = [dummyProblem1, dummyProblem2, dummyProblem3, dummyProblem4];

  describe('Phase 3 — Genuine Learning Progress Calculations', () => {
    it('returns truthful empty state when no events are recorded', () => {
      const stats = computeUserStats([], dummyProblems, CONCEPTS);
      expect(stats.problemsPracticed).toBe(0);
      expect(stats.conceptsReviewed).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.weakAreas).toHaveLength(0);
      expect(stats.recentlyStudied).toHaveLength(0);
      expect(stats.hintReliance?.averageLevel).toBeNull();
      expect(stats.hintReliance?.label).toBe('—');
      expect(stats.difficultyBreakdown).toEqual({ easy: 0, medium: 0, hard: 0 });
    });

    it('counts distinct completed problems and breaks down by difficulty', () => {
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'problem_completed',
          targetId: 'test-prob-1',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { highestHintLevel: 'nudge' }
        },
        {
          id: '2',
          type: 'problem_completed',
          targetId: 'test-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-18T11:00:00.000Z',
          metadata: { highestHintLevel: 'strong_hint' }
        },
        // Duplicate completion event for test-prob-1
        {
          id: '3',
          type: 'problem_completed',
          targetId: 'test-prob-1',
          targetType: 'problem',
          timestamp: '2026-10-18T12:00:00.000Z',
          metadata: { highestHintLevel: 'nudge' }
        }
      ];

      const stats = computeUserStats(events, dummyProblems, CONCEPTS);
      expect(stats.problemsPracticed).toBe(2);
      expect(stats.difficultyBreakdown).toEqual({ easy: 1, medium: 1, hard: 0 });
    });

    it('calculates average hint reliance across evaluated completed sessions', () => {
      // test-prob-1: nudge (depth 1)
      // test-prob-2: strong_hint (depth 3)
      // Average: (1 + 3) / 2 = 2.0 -> "Lvl 2"
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'problem_completed',
          targetId: 'test-prob-1',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { highestHintLevel: 'nudge' }
        },
        {
          id: '2',
          type: 'problem_completed',
          targetId: 'test-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-18T11:00:00.000Z',
          metadata: { highestHintLevel: 'strong_hint' }
        }
      ];

      const stats = computeUserStats(events, dummyProblems, CONCEPTS);
      expect(stats.hintReliance?.averageLevel).toBe(2);
      expect(stats.hintReliance?.label).toBe('Lvl 2');
      expect(stats.hintReliance?.evaluatedSessions).toBe(2);
    });

    it('counts completed problem with no hints requested as level 0 depth', () => {
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'problem_completed',
          targetId: 'test-prob-1',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { highestHintLevel: null }
        }
      ];

      const stats = computeUserStats(events, dummyProblems, CONCEPTS);
      expect(stats.hintReliance?.averageLevel).toBe(0);
      expect(stats.hintReliance?.label).toBe('Lvl 0');
    });

    describe('Streak Calculation', () => {
      const refDate = new Date('2026-10-18T12:00:00.000Z');

      it('returns 0 when there is no activity', () => {
        expect(calculateStreak([], refDate)).toBe(0);
      });

      it('returns 1 when there is activity today', () => {
        const events: LearningEvent[] = [
          {
            id: '1',
            type: 'problem_opened',
            targetId: 'test-prob-1',
            targetType: 'problem',
            timestamp: '2026-10-18T08:00:00.000Z'
          }
        ];
        expect(calculateStreak(events, refDate)).toBe(1);
      });

      it('returns consecutive active days ending today', () => {
        const events: LearningEvent[] = [
          {
            id: '1',
            type: 'problem_opened',
            targetId: 'p1',
            targetType: 'problem',
            timestamp: '2026-10-18T09:00:00.000Z'
          },
          {
            id: '2',
            type: 'problem_opened',
            targetId: 'p2',
            targetType: 'problem',
            timestamp: '2026-10-17T09:00:00.000Z'
          },
          {
            id: '3',
            type: 'problem_opened',
            targetId: 'p3',
            targetType: 'problem',
            timestamp: '2026-10-16T09:00:00.000Z'
          }
        ];
        expect(calculateStreak(events, refDate)).toBe(3);
      });

      it('preserves streak if user has not yet practiced today but practiced yesterday', () => {
        const events: LearningEvent[] = [
          {
            id: '1',
            type: 'problem_opened',
            targetId: 'p1',
            targetType: 'problem',
            timestamp: '2026-10-17T09:00:00.000Z'
          },
          {
            id: '2',
            type: 'problem_opened',
            targetId: 'p2',
            targetType: 'problem',
            timestamp: '2026-10-16T09:00:00.000Z'
          }
        ];
        // Practiced yesterday (17th) and day before (16th), none yet today (18th)
        expect(calculateStreak(events, refDate)).toBe(2);
      });

      it('returns 0 if last activity was 2 or more days ago', () => {
        const events: LearningEvent[] = [
          {
            id: '1',
            type: 'problem_opened',
            targetId: 'p1',
            targetType: 'problem',
            timestamp: '2026-10-15T09:00:00.000Z'
          }
        ];
        expect(calculateStreak(events, refDate)).toBe(0);
      });

      it('ignores malformed timestamps defensively without crashing', () => {
        const events: LearningEvent[] = [
          {
            id: '1',
            type: 'problem_opened',
            targetId: 'p1',
            targetType: 'problem',
            timestamp: 'corrupted-timestamp'
          },
          {
            id: '2',
            type: 'problem_opened',
            targetId: 'p2',
            targetType: 'problem',
            timestamp: '2026-10-18T10:00:00.000Z'
          }
        ];
        expect(calculateStreak(events, refDate)).toBe(1);
      });
    });
  });

  describe('Phase 4 — Explainable Weakness Detection', () => {
    it('does not flag a topic as weak when sample size is below minimum threshold (3)', () => {
      // Only 1 session for Dynamic Programming
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'hint_requested',
          targetId: 'test-prob-2', // Dynamic Programming
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { hintLevel: 'strong_hint' }
        }
      ];

      const reports = detectTopicWeaknesses(events, dummyProblems);
      const dpReport = reports.find(r => r.topic === 'Dynamic Programming');

      expect(dpReport).toBeDefined();
      expect(dpReport?.status).toBe('Insufficient Data');
      expect(dpReport?.urgency).toBe('None');
      expect(dpReport?.sessionCount).toBe(1);
      expect(dpReport?.reason).toContain(`Not enough practice data: 1 of ${MIN_EVALUATION_SESSIONS} required sessions`);
    });

    it('identifies topic as Needs Practice with explainable reason when >= 50% sessions are hint-heavy', () => {
      // 3 distinct DP problems:
      // test-prob-2: strong_hint (level 3) -> hint heavy
      // test-prob-3: explain (level 4) -> hint heavy
      // test-prob-4: nudge (level 1) -> not hint heavy
      // Ratio: 2/3 = 66.7% >= 50%
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'hint_requested',
          targetId: 'test-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-16T10:00:00.000Z',
          metadata: { hintLevel: 'strong_hint' }
        },
        {
          id: '2',
          type: 'hint_requested',
          targetId: 'test-prob-3',
          targetType: 'problem',
          timestamp: '2026-10-17T10:00:00.000Z',
          metadata: { hintLevel: 'explain' }
        },
        {
          id: '3',
          type: 'hint_requested',
          targetId: 'test-prob-4',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { hintLevel: 'nudge' }
        }
      ];

      const reports = detectTopicWeaknesses(events, dummyProblems);
      const dpReport = reports.find(r => r.topic === 'Dynamic Programming');

      expect(dpReport).toBeDefined();
      expect(dpReport?.status).toBe('Needs Practice');
      expect(dpReport?.sessionCount).toBe(3);
      expect(dpReport?.hintHeavyCount).toBe(2);
      expect(dpReport?.reason).toBe(
        'Dynamic Programming may need more practice: across 3 recorded sessions, you requested level 3+ hints in 2 sessions.'
      );
    });

    it('flags topic as Proficient when 3+ sessions are completed with minimal/no hints', () => {
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'problem_completed',
          targetId: 'test-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-16T10:00:00.000Z',
          metadata: { highestHintLevel: null }
        },
        {
          id: '2',
          type: 'problem_completed',
          targetId: 'test-prob-3',
          targetType: 'problem',
          timestamp: '2026-10-17T10:00:00.000Z',
          metadata: { highestHintLevel: 'nudge' }
        },
        {
          id: '3',
          type: 'problem_completed',
          targetId: 'test-prob-4',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { highestHintLevel: 'hint' } // level 2 is below 3
        }
      ];

      const reports = detectTopicWeaknesses(events, dummyProblems);
      const dpReport = reports.find(r => r.topic === 'Dynamic Programming');

      expect(dpReport?.status).toBe('Proficient');
      expect(dpReport?.hintHeavyCount).toBe(0);
      expect(dpReport?.reason).toContain('Demonstrated independence: across 3 sessions');
    });

    it('attributes multiple tags of a problem accurately', () => {
      // test-prob-1 has tags: ['Array', 'Two Pointers']
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'hint_requested',
          targetId: 'test-prob-1',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { hintLevel: 'nudge' }
        }
      ];

      const reports = detectTopicWeaknesses(events, dummyProblems);
      const arrayReport = reports.find(r => r.topic === 'Array');
      const twoPointersReport = reports.find(r => r.topic === 'Two Pointers');

      expect(arrayReport).toBeDefined();
      expect(twoPointersReport).toBeDefined();
      expect(arrayReport?.sessionCount).toBe(1);
      expect(twoPointersReport?.sessionCount).toBe(1);
    });

    it('is completely deterministic across repeated calculations', () => {
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'hint_requested',
          targetId: 'test-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-16T10:00:00.000Z',
          metadata: { hintLevel: 'strong_hint' }
        },
        {
          id: '2',
          type: 'hint_requested',
          targetId: 'test-prob-3',
          targetType: 'problem',
          timestamp: '2026-10-17T10:00:00.000Z',
          metadata: { hintLevel: 'explain' }
        },
        {
          id: '3',
          type: 'hint_requested',
          targetId: 'test-prob-4',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { hintLevel: 'strong_hint' }
        }
      ];

      const result1 = detectTopicWeaknesses(events, dummyProblems);
      const result2 = detectTopicWeaknesses(events, dummyProblems);

      expect(result1).toEqual(result2);
    });
  });
});
