import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeUserStats,
  calculateStreak,
  detectTopicWeaknesses,
  hintLevelToDepth,
  toLocalDateString,
  MIN_EVALUATION_SESSIONS
} from '../services/analytics';
import {
  recordLearningEvent,
  loadLearningEvents,
  saveLearningEvents,
  clearLearningEvents,
  loadProblemCompletions,
  saveProblemCompletions,
  clearProblemCompletions,
  getCompletedProblemIds,
  getCompletedProblemIdsFromEvents,
  resetUserStats,
  saveMentorSession,
  findSavedSession,
  DEFAULT_STATS
} from '../services/storage';
import { LearningEvent, Problem, Concept, ProblemCompletionRecord } from '../types';
import { PROBLEMS } from '../data/problems';
import { CONCEPTS } from '../data/concepts';

describe('Milestone 2 Validation & Analytics Integrity Audit', () => {
  const prob1: Problem = {
    ...PROBLEMS[0],
    id: 'audit-prob-1',
    title: 'Audit Problem 1',
    difficulty: 'Easy',
    tags: ['Array', 'Two Pointers'],
    category: 'Arrays & Hashing'
  };

  const prob2: Problem = {
    ...PROBLEMS[1],
    id: 'audit-prob-2',
    title: 'Audit Problem 2',
    difficulty: 'Medium',
    tags: ['Dynamic Programming'],
    category: 'Dynamic Programming'
  };

  const prob3: Problem = {
    ...PROBLEMS[2],
    id: 'audit-prob-3',
    title: 'Audit Problem 3',
    difficulty: 'Hard',
    tags: ['Dynamic Programming'],
    category: 'Dynamic Programming'
  };

  const prob4: Problem = {
    ...PROBLEMS[3],
    id: 'audit-prob-4',
    title: 'Audit Problem 4',
    difficulty: 'Medium',
    tags: ['Dynamic Programming'],
    category: 'Dynamic Programming'
  };

  const testProblems = [prob1, prob2, prob3, prob4];

  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Distinct Attempts vs Repeated Visits', () => {
    it('does not count mere problem_opened events as valid evaluated sessions', () => {
      // User browses 3 DP problems without hints, code, or completion
      const events: LearningEvent[] = [
        {
          id: 'open-1',
          type: 'problem_opened',
          targetId: 'audit-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z'
        },
        {
          id: 'open-2',
          type: 'problem_opened',
          targetId: 'audit-prob-3',
          targetType: 'problem',
          timestamp: '2026-10-18T10:05:00.000Z'
        },
        {
          id: 'open-3',
          type: 'problem_opened',
          targetId: 'audit-prob-4',
          targetType: 'problem',
          timestamp: '2026-10-18T10:10:00.000Z'
        }
      ];

      const reports = detectTopicWeaknesses(events, testProblems);
      const dpReport = reports.find(r => r.topic === 'Dynamic Programming');

      // Must be Insufficient Data or omitted (0 sessions recorded), NOT Proficient
      expect(dpReport).toBeUndefined();
    });

    it('repeatedly visiting the same problem does not satisfy the 3-session evidence threshold', () => {
      // User opens and requests hints on the SAME problem 5 times
      const events: LearningEvent[] = [
        {
          id: 'hint-1',
          type: 'hint_requested',
          targetId: 'audit-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { hintLevel: 'nudge' }
        },
        {
          id: 'hint-2',
          type: 'hint_requested',
          targetId: 'audit-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-18T10:05:00.000Z',
          metadata: { hintLevel: 'hint' }
        },
        {
          id: 'hint-3',
          type: 'hint_requested',
          targetId: 'audit-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-18T10:10:00.000Z',
          metadata: { hintLevel: 'strong_hint' }
        }
      ];

      const reports = detectTopicWeaknesses(events, testProblems);
      const dpReport = reports.find(r => r.topic === 'Dynamic Programming');

      expect(dpReport).toBeDefined();
      expect(dpReport?.sessionCount).toBe(1); // Only 1 problem session, not 3
      expect(dpReport?.status).toBe('Insufficient Data');
    });
  });

  describe('2. Duplicate Completion Events Idempotency', () => {
    it('ignores duplicate completion requests for an already completed problem', () => {
      const first = recordLearningEvent({
        type: 'problem_completed',
        targetId: 'audit-prob-1',
        targetType: 'problem',
        metadata: { highestHintLevel: 'nudge', selfReported: true }
      });
      expect(first).not.toBeNull();

      const duplicate = recordLearningEvent({
        type: 'problem_completed',
        targetId: 'audit-prob-1',
        targetType: 'problem',
        metadata: { highestHintLevel: 'nudge', selfReported: true }
      });
      // Should return existing event without adding duplicate
      expect(duplicate?.id).toBe(first?.id);

      const events = loadLearningEvents();
      const completionEvents = events.filter(e => e.type === 'problem_completed' && e.targetId === 'audit-prob-1');
      expect(completionEvents).toHaveLength(1);

      const completions = loadProblemCompletions();
      expect(completions.size).toBe(1);
    });
  });

  describe('3. Completion Followed by Undo', () => {
    it('correctly tracks completion then undo in both learning events and persistent completions', () => {
      recordLearningEvent({
        type: 'problem_completed',
        targetId: 'audit-prob-1',
        targetType: 'problem',
        metadata: { highestHintLevel: null }
      });
      expect(getCompletedProblemIds().has('audit-prob-1')).toBe(true);

      // Undo completion
      recordLearningEvent({
        type: 'problem_uncompleted',
        targetId: 'audit-prob-1',
        targetType: 'problem'
      });
      expect(getCompletedProblemIds().has('audit-prob-1')).toBe(false);

      const completions = loadProblemCompletions();
      expect(completions.has('audit-prob-1')).toBe(false);
    });
  });

  describe('4. Minimum Evidence Threshold (Fewer than 3 vs Exactly 3)', () => {
    it('produces Insufficient Data when fewer than 3 valid problem sessions are recorded', () => {
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'problem_completed',
          targetId: 'audit-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { highestHintLevel: 'nudge' }
        },
        {
          id: '2',
          type: 'problem_completed',
          targetId: 'audit-prob-3',
          targetType: 'problem',
          timestamp: '2026-10-18T11:00:00.000Z',
          metadata: { highestHintLevel: 'strong_hint' }
        }
      ];

      const reports = detectTopicWeaknesses(events, testProblems);
      const dpReport = reports.find(r => r.topic === 'Dynamic Programming');

      expect(dpReport?.status).toBe('Insufficient Data');
      expect(dpReport?.sessionCount).toBe(2);
      expect(dpReport?.urgency).toBe('None');
    });

    it('evaluates status when exactly 3 valid problem sessions are recorded', () => {
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'problem_completed',
          targetId: 'audit-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { highestHintLevel: 'nudge' }
        },
        {
          id: '2',
          type: 'problem_completed',
          targetId: 'audit-prob-3',
          targetType: 'problem',
          timestamp: '2026-10-18T11:00:00.000Z',
          metadata: { highestHintLevel: 'strong_hint' }
        },
        {
          id: '3',
          type: 'problem_completed',
          targetId: 'audit-prob-4',
          targetType: 'problem',
          timestamp: '2026-10-18T12:00:00.000Z',
          metadata: { highestHintLevel: 'nudge' }
        }
      ];

      const reports = detectTopicWeaknesses(events, testProblems);
      const dpReport = reports.find(r => r.topic === 'Dynamic Programming');

      expect(dpReport?.sessionCount).toBe(3);
      expect(dpReport?.status).toBe('Developing'); // 1 out of 3 is heavy (33% < 50%)
    });
  });

  describe('5. Hint-Level Classification Boundaries (50% and 75%)', () => {
    it('classifies as Needs Practice with Medium urgency at exactly 50%', () => {
      // 4 distinct sessions: 2 hint-heavy (level 3, level 4), 2 low (level 1, level 2)
      // Ratio: 2/4 = exactly 0.50 -> Medium urgency
      const p5: Problem = { ...prob4, id: 'audit-prob-5' };
      const problemsWith5 = [...testProblems, p5];

      const events: LearningEvent[] = [
        { id: '1', type: 'problem_completed', targetId: 'audit-prob-2', targetType: 'problem', timestamp: '2026-10-18T10:00:00.000Z', metadata: { highestHintLevel: 'strong_hint' } },
        { id: '2', type: 'problem_completed', targetId: 'audit-prob-3', targetType: 'problem', timestamp: '2026-10-18T11:00:00.000Z', metadata: { highestHintLevel: 'explain' } },
        { id: '3', type: 'problem_completed', targetId: 'audit-prob-4', targetType: 'problem', timestamp: '2026-10-18T12:00:00.000Z', metadata: { highestHintLevel: 'nudge' } },
        { id: '4', type: 'problem_completed', targetId: 'audit-prob-5', targetType: 'problem', timestamp: '2026-10-18T13:00:00.000Z', metadata: { highestHintLevel: 'hint' } }
      ];

      const reports = detectTopicWeaknesses(events, problemsWith5);
      const dpReport = reports.find(r => r.topic === 'Dynamic Programming');

      expect(dpReport?.status).toBe('Needs Practice');
      expect(dpReport?.urgency).toBe('Medium');
      expect(dpReport?.sessionCount).toBe(4);
      expect(dpReport?.hintHeavyCount).toBe(2);
    });

    it('classifies as Needs Practice with High urgency at exactly 75%', () => {
      // 4 distinct sessions: 3 hint-heavy, 1 low
      // Ratio: 3/4 = exactly 0.75 -> High urgency
      const p5: Problem = { ...prob4, id: 'audit-prob-5' };
      const problemsWith5 = [...testProblems, p5];

      const events: LearningEvent[] = [
        { id: '1', type: 'problem_completed', targetId: 'audit-prob-2', targetType: 'problem', timestamp: '2026-10-18T10:00:00.000Z', metadata: { highestHintLevel: 'strong_hint' } },
        { id: '2', type: 'problem_completed', targetId: 'audit-prob-3', targetType: 'problem', timestamp: '2026-10-18T11:00:00.000Z', metadata: { highestHintLevel: 'explain' } },
        { id: '3', type: 'problem_completed', targetId: 'audit-prob-4', targetType: 'problem', timestamp: '2026-10-18T12:00:00.000Z', metadata: { highestHintLevel: 'solution' } },
        { id: '4', type: 'problem_completed', targetId: 'audit-prob-5', targetType: 'problem', timestamp: '2026-10-18T13:00:00.000Z', metadata: { highestHintLevel: 'nudge' } }
      ];

      const reports = detectTopicWeaknesses(events, problemsWith5);
      const dpReport = reports.find(r => r.topic === 'Dynamic Programming');

      expect(dpReport?.status).toBe('Needs Practice');
      expect(dpReport?.urgency).toBe('High');
      expect(dpReport?.sessionCount).toBe(4);
      expect(dpReport?.hintHeavyCount).toBe(3);
    });
  });

  describe('6. Missing Hint History vs Confirmed 0-Hint Solves', () => {
    it('distinguishes missing historical hint data from confirmed 0-hint independent solves', () => {
      // prob-1: confirmed 0 hints (highestHintLevel: null)
      // prob-2: legacy event with missing highestHintLevel field (undefined) and no hint events
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'problem_completed',
          targetId: 'audit-prob-1',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: { highestHintLevel: null }
        },
        {
          id: '2',
          type: 'problem_completed',
          targetId: 'audit-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-18T11:00:00.000Z',
          metadata: {} // missing highestHintLevel
        }
      ];

      const stats = computeUserStats(events, testProblems, CONCEPTS);
      // Evaluated sessions should only be 1 (prob-1), not 2
      expect(stats.hintReliance?.evaluatedSessions).toBe(1);
      expect(stats.hintReliance?.averageLevel).toBe(0);
      expect(stats.hintReliance?.label).toBe('Lvl 0');
    });

    it('returns truthful unavailable state (—) when all completed problems lack hint tracking', () => {
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'problem_completed',
          targetId: 'audit-prob-1',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z',
          metadata: {} // untracked
        }
      ];

      const stats = computeUserStats(events, testProblems, CONCEPTS);
      expect(stats.hintReliance?.evaluatedSessions).toBe(0);
      expect(stats.hintReliance?.averageLevel).toBeNull();
      expect(stats.hintReliance?.label).toBe('—');
    });
  });

  describe('7. Retention-Cap Behavior and Historical Progress', () => {
    it('preserves completed problem state when learning events roll off past the 500-event cap', () => {
      // 1. User completes problem-1
      recordLearningEvent({
        type: 'problem_completed',
        targetId: 'audit-prob-1',
        targetType: 'problem',
        metadata: { highestHintLevel: null }
      });

      expect(getCompletedProblemIds().has('audit-prob-1')).toBe(true);

      // 2. Generate 550 subsequent learning events (e.g. concept views)
      for (let i = 0; i < 550; i++) {
        recordLearningEvent({
          id: `filler-evt-${i}`,
          type: 'concept_studied',
          targetId: 'arrays',
          targetType: 'concept',
          timestamp: new Date(Date.now() + i * 1000).toISOString()
        });
      }

      const storedEvents = loadLearningEvents();
      expect(storedEvents.length).toBe(500); // capped at 500

      // The original problem_completed event for audit-prob-1 has been rolled off from events!
      const eventFound = storedEvents.find(e => e.type === 'problem_completed' && e.targetId === 'audit-prob-1');
      expect(eventFound).toBeUndefined();

      // BUT the persistent completion store preserves audit-prob-1!
      const completedIds = getCompletedProblemIds();
      expect(completedIds.has('audit-prob-1')).toBe(true);

      // And computeUserStats preserves the completion and difficulty breakdown
      const completions = loadProblemCompletions();
      const stats = computeUserStats(storedEvents, testProblems, CONCEPTS, new Date(), completions);
      expect(stats.problemsPracticed).toBe(1);
      expect(stats.difficultyBreakdown?.easy).toBe(1);
      expect(stats.hintReliance?.evaluatedSessions).toBe(1);
      expect(stats.hintReliance?.label).toBe('Lvl 0');
    });
  });

  describe('8. Invalid Events and Timestamps', () => {
    it('defensively handles malformed timestamps in calculateStreak without crashing or NaN', () => {
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'hint_requested',
          targetId: 'audit-prob-1',
          targetType: 'problem',
          timestamp: 'invalid-date'
        },
        {
          id: '2',
          type: 'hint_requested',
          targetId: 'audit-prob-1',
          targetType: 'problem',
          timestamp: ''
        },
        {
          id: '3',
          type: 'hint_requested',
          targetId: 'audit-prob-1',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z'
        }
      ];

      const refDate = new Date('2026-10-18T12:00:00.000Z');
      const streak = calculateStreak(events, refDate);
      expect(streak).toBe(1);
    });

    it('excludes problem_uncompleted from streak qualifying events', () => {
      const events: LearningEvent[] = [
        {
          id: '1',
          type: 'problem_uncompleted',
          targetId: 'audit-prob-1',
          targetType: 'problem',
          timestamp: '2026-10-18T10:00:00.000Z'
        }
      ];

      const refDate = new Date('2026-10-18T12:00:00.000Z');
      const streak = calculateStreak(events, refDate);
      expect(streak).toBe(0);
    });
  });

  describe('9. Reset Behavior & Session Preservation', () => {
    it('clears learning events and completion records but preserves saved mentor sessions', () => {
      // 1. Record completed problem
      recordLearningEvent({
        type: 'problem_completed',
        targetId: 'audit-prob-1',
        targetType: 'problem',
        metadata: { highestHintLevel: 'nudge' }
      });

      // 2. Save a mentor session
      saveMentorSession({
        id: 'session-problem-audit-prob-1',
        title: 'Audit Problem 1 Session',
        mode: 'problem',
        problemId: 'audit-prob-1',
        currentStage: 'hints',
        highestHintLevel: 'nudge',
        messages: [],
        updatedAt: new Date().toISOString()
      });

      // Verify initial presence
      expect(getCompletedProblemIds().size).toBe(1);
      expect(findSavedSession('problem', 'audit-prob-1')).not.toBeNull();

      // 3. Reset stats
      const resetResult = resetUserStats();
      expect(resetResult.problemsPracticed).toBe(0);

      // Completions and events must be cleared
      expect(getCompletedProblemIds().size).toBe(0);
      expect(loadLearningEvents()).toHaveLength(0);
      expect(loadProblemCompletions().size).toBe(0);

      // Saved mentor session MUST still exist!
      const preservedSession = findSavedSession('problem', 'audit-prob-1');
      expect(preservedSession).not.toBeNull();
      expect(preservedSession?.title).toBe('Audit Problem 1 Session');
    });
  });

  describe('10. Legacy localStorage Compatibility', () => {
    it('automatically reconstructs completions map from legacy learning events if COMPLETIONS_KEY is missing', () => {
      // Simulate legacy user state: learning events exist in localStorage, but completions key was never created
      const legacyEvents: LearningEvent[] = [
        {
          id: 'legacy-1',
          type: 'problem_completed',
          targetId: 'audit-prob-1',
          targetType: 'problem',
          timestamp: '2026-10-17T10:00:00.000Z',
          metadata: { highestHintLevel: 'nudge', selfReported: true }
        },
        {
          id: 'legacy-2',
          type: 'problem_completed',
          targetId: 'audit-prob-2',
          targetType: 'problem',
          timestamp: '2026-10-17T11:00:00.000Z',
          metadata: { highestHintLevel: null, selfReported: true }
        }
      ];

      localStorage.setItem('algobuddy_learning_events', JSON.stringify(legacyEvents));
      expect(localStorage.getItem('algobuddy_problem_completions')).toBeNull();

      // Calling loadProblemCompletions() should auto-migrate
      const completions = loadProblemCompletions();
      expect(completions.size).toBe(2);
      expect(completions.has('audit-prob-1')).toBe(true);
      expect(completions.get('audit-prob-1')?.highestHintLevel).toBe('nudge');
      expect(completions.has('audit-prob-2')).toBe(true);
      expect(completions.get('audit-prob-2')?.highestHintLevel).toBeNull();

      // Verify it was persisted to localStorage
      expect(localStorage.getItem('algobuddy_problem_completions')).not.toBeNull();
    });
  });

  describe('11. Consistency Between Totals and Difficulty Breakdowns', () => {
    it('reconciles total completed count with difficulty breakdown', () => {
      const events: LearningEvent[] = [
        { id: '1', type: 'problem_completed', targetId: 'audit-prob-1', targetType: 'problem', timestamp: '2026-10-18T10:00:00.000Z' }, // Easy
        { id: '2', type: 'problem_completed', targetId: 'audit-prob-2', targetType: 'problem', timestamp: '2026-10-18T11:00:00.000Z' }, // Medium
        { id: '3', type: 'problem_completed', targetId: 'audit-prob-3', targetType: 'problem', timestamp: '2026-10-18T12:00:00.000Z' }  // Hard
      ];

      const stats = computeUserStats(events, testProblems, CONCEPTS);
      expect(stats.problemsPracticed).toBe(3);
      expect(stats.difficultyBreakdown?.easy).toBe(1);
      expect(stats.difficultyBreakdown?.medium).toBe(1);
      expect(stats.difficultyBreakdown?.hard).toBe(1);
      expect(
        (stats.difficultyBreakdown?.easy ?? 0) +
        (stats.difficultyBreakdown?.medium ?? 0) +
        (stats.difficultyBreakdown?.hard ?? 0)
      ).toBe(stats.problemsPracticed);
    });
  });

  describe('12. Migration Semantics & State Cycles (Phase 2 & Phase 5 Edge Cases)', () => {
    it('distinguishes a missing completion-store key from an existing empty store and does not re-migrate', () => {
      // Legacy events contain a completion
      const legacyEvents: LearningEvent[] = [
        {
          id: 'legacy-1',
          type: 'problem_completed',
          targetId: 'audit-prob-1',
          targetType: 'problem',
          timestamp: '2026-10-17T10:00:00.000Z',
          metadata: { highestHintLevel: null }
        }
      ];
      localStorage.setItem('algobuddy_learning_events', JSON.stringify(legacyEvents));

      // Key explicitly exists but is empty '{}' (e.g. all problems were uncompleted)
      localStorage.setItem('algobuddy_problem_completions', '{}');

      // loadProblemCompletions must recognize that key exists and return empty map, NOT re-migrating legacy-1
      const completions = loadProblemCompletions();
      expect(completions.size).toBe(0);
      expect(completions.has('audit-prob-1')).toBe(false);
    });

    it('handles completion -> undo -> completion cycle correctly', () => {
      // 1. Initial completion with nudge
      recordLearningEvent({
        type: 'problem_completed',
        targetId: 'audit-prob-1',
        targetType: 'problem',
        metadata: { highestHintLevel: 'nudge' }
      });
      expect(loadProblemCompletions().get('audit-prob-1')?.highestHintLevel).toBe('nudge');

      // 2. Undo completion
      recordLearningEvent({
        type: 'problem_uncompleted',
        targetId: 'audit-prob-1',
        targetType: 'problem'
      });
      expect(loadProblemCompletions().has('audit-prob-1')).toBe(false);

      // 3. Later re-completion with solution
      recordLearningEvent({
        type: 'problem_completed',
        targetId: 'audit-prob-1',
        targetType: 'problem',
        metadata: { highestHintLevel: 'solution' }
      });
      const reCompleted = loadProblemCompletions().get('audit-prob-1');
      expect(reCompleted).toBeDefined();
      expect(reCompleted?.highestHintLevel).toBe('solution');
    });

    it('safely handles corrupted completion-store data without throwing or overwriting with stale events', () => {
      localStorage.setItem('algobuddy_problem_completions', 'INVALID_JSON_CORRUPT');
      // Calling loadProblemCompletions should return empty map safely
      const completions = loadProblemCompletions();
      expect(completions.size).toBe(0);
    });

    it('preserves topic weakness evidence even after learning events roll off past the 500-event cap', () => {
      // Complete 3 distinct DP problems with 0 hints (demonstrating Proficiency)
      recordLearningEvent({ type: 'problem_completed', targetId: 'audit-prob-2', targetType: 'problem', metadata: { highestHintLevel: null } });
      recordLearningEvent({ type: 'problem_completed', targetId: 'audit-prob-3', targetType: 'problem', metadata: { highestHintLevel: null } });
      recordLearningEvent({ type: 'problem_completed', targetId: 'audit-prob-4', targetType: 'problem', metadata: { highestHintLevel: null } });

      // Add 550 subsequent events to roll off the completion events from bounded store
      for (let i = 0; i < 550; i++) {
        recordLearningEvent({
          id: `fill-${i}`,
          type: 'concept_studied',
          targetId: 'arrays',
          targetType: 'concept',
          timestamp: new Date(Date.now() + i * 1000).toISOString()
        });
      }

      const storedEvents = loadLearningEvents();
      expect(storedEvents.length).toBe(500);
      // Raw completion events rolled off
      expect(storedEvents.some(e => e.type === 'problem_completed')).toBe(false);

      // BUT persistedCompletions preserves them
      const completions = loadProblemCompletions();
      expect(completions.size).toBe(3);

      // detectTopicWeaknesses preserves topic evidence and classifies topic as Proficient
      const reports = detectTopicWeaknesses(storedEvents, testProblems, completions);
      const dpReport = reports.find(r => r.topic === 'Dynamic Programming');
      expect(dpReport).toBeDefined();
      expect(dpReport?.sessionCount).toBe(3);
      expect(dpReport?.status).toBe('Proficient');
    });
  });
});
