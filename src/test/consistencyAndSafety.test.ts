import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordLearningEvent,
  loadLearningEvents,
  resetUserStats,
  loadUserStats,
  DEFAULT_STATS,
  saveMentorSession,
  loadSavedSessions
} from '../services/storage';
import { computeUserStats } from '../services/analytics';
import { PROBLEMS } from '../data/problems';
import { CONCEPTS } from '../data/concepts';
import { MentorSession } from '../types';

describe('Phase 6 — Consistency and Regression Safety Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('restoring a saved mentor session does not create duplicate learning events', () => {
    // Record initial session
    const session: MentorSession = {
      id: `session-problem-${PROBLEMS[0].id}`,
      title: PROBLEMS[0].title,
      mode: 'problem',
      problemId: PROBLEMS[0].id,
      currentStage: 'pattern',
      highestHintLevel: 'hint',
      completed: false,
      messages: [
        {
          id: '1',
          sender: 'mentor',
          content: 'Hello',
          timestamp: '10:00 AM'
        }
      ],
      updatedAt: '2026-10-18T10:00:00.000Z'
    };
    saveMentorSession(session);

    // Record open event with idempotent ID
    const today = '2026-10-18';
    recordLearningEvent({
      id: `open-${PROBLEMS[0].id}-${today}`,
      type: 'problem_opened',
      targetId: PROBLEMS[0].id,
      targetType: 'problem'
    });

    // Simulate session restoration re-triggering open event
    recordLearningEvent({
      id: `open-${PROBLEMS[0].id}-${today}`,
      type: 'problem_opened',
      targetId: PROBLEMS[0].id,
      targetType: 'problem'
    });

    const events = loadLearningEvents();
    const openEvents = events.filter(e => e.type === 'problem_opened' && e.targetId === PROBLEMS[0].id);
    expect(openEvents).toHaveLength(1);
  });

  it('switching problems associates events with the new problem ID rather than stale ID', () => {
    // Problem 1 opened and hint requested
    recordLearningEvent({
      type: 'hint_requested',
      targetId: PROBLEMS[0].id,
      targetType: 'problem',
      metadata: { hintLevel: 'nudge' }
    });

    // Switch to Problem 2
    recordLearningEvent({
      type: 'hint_requested',
      targetId: PROBLEMS[1].id,
      targetType: 'problem',
      metadata: { hintLevel: 'strong_hint' }
    });

    const events = loadLearningEvents();
    expect(events[0].targetId).toBe(PROBLEMS[1].id);
    expect(events[0].metadata?.hintLevel).toBe('strong_hint');
    expect(events[1].targetId).toBe(PROBLEMS[0].id);
    expect(events[1].metadata?.hintLevel).toBe('nudge');
  });

  it('resetUserStats clears both aggregate stats and underlying learning events atomically', () => {
    // Add learning events and completed problem
    recordLearningEvent({
      type: 'problem_completed',
      targetId: PROBLEMS[0].id,
      targetType: 'problem',
      metadata: { selfReported: true, verification: 'self_reported' }
    });

    expect(loadLearningEvents()).toHaveLength(1);

    // Call reset
    const resetResult = resetUserStats();

    expect(resetResult).toEqual(DEFAULT_STATS);
    expect(loadUserStats()).toEqual(DEFAULT_STATS);
    expect(loadLearningEvents()).toHaveLength(0);

    // Derived stats from events should now also be clean empty defaults
    const computed = computeUserStats(loadLearningEvents(), PROBLEMS, CONCEPTS);
    expect(computed.problemsPracticed).toBe(0);
    expect(computed.currentStreak).toBe(0);
    expect(computed.weakAreas).toHaveLength(0);
    expect(computed.hintReliance?.averageLevel).toBeNull();
  });

  it('reads legacy localStorage schemas safely without data loss or exceptions', () => {
    // Legacy format had only algobuddy_user_stats and no learning events key
    localStorage.setItem(
      'algobuddy_user_stats',
      JSON.stringify({
        problemsPracticed: 2,
        conceptsReviewed: 1,
        currentStreak: 1,
        weakAreas: [],
        recentlyStudied: [],
        recommendedNext: []
      })
    );

    const legacyStats = loadUserStats();
    expect(legacyStats.problemsPracticed).toBe(2);
    expect(legacyStats.conceptsReviewed).toBe(1);

    // Learning events loader handles missing key cleanly
    const events = loadLearningEvents();
    expect(events).toEqual([]);
  });

  it('empty defaults remain strictly free of fabricated analytics', () => {
    const fresh = computeUserStats([], PROBLEMS, CONCEPTS);
    expect(fresh.problemsPracticed).toBe(0);
    expect(fresh.conceptsReviewed).toBe(0);
    expect(fresh.currentStreak).toBe(0);
    expect(fresh.weakAreas).toEqual([]);
    expect(fresh.recentlyStudied).toEqual([]);
    expect(fresh.hintReliance?.averageLevel).toBeNull();
    expect(fresh.hintReliance?.label).toBe('—');
  });
});
