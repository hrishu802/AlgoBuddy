import { describe, it, expect, beforeEach } from 'vitest';
import {
  SPACED_REVIEW_INTERVALS,
  CONCEPT_PROBLEM_MAP,
  calculateNextReviewDate,
  getIntervalForStage,
  evaluateReviewDueStatus,
  syncSpacedReviewsWithCompletions,
  getDueReviews,
  getConceptProblemBridge,
  generateAdaptiveRecommendations
} from '../services/recommendations';
import {
  loadSpacedReviews,
  saveSpacedReviews,
  clearSpacedReviews,
  scheduleSpacedReview,
  recordReviewCompletion,
  removeSpacedReview,
  resetUserStats,
  recordLearningEvent,
  loadProblemCompletions,
  saveProblemCompletions
} from '../services/storage';
import { Problem, Concept, UserStats, LearningEvent, SpacedReviewRecord, ProblemCompletionRecord } from '../types';
import { PROBLEMS } from '../data/problems';
import { CONCEPTS } from '../data/concepts';

describe('Milestone 3: Spaced Review Scheduling & Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Interval Calculations & Staging', () => {
    it('returns the exact sequence of intervals: 1, 3, 7, 14, and 30 days', () => {
      expect(getIntervalForStage(0)).toBe(1);
      expect(getIntervalForStage(1)).toBe(3);
      expect(getIntervalForStage(2)).toBe(7);
      expect(getIntervalForStage(3)).toBe(14);
      expect(getIntervalForStage(4)).toBe(30);
      expect(getIntervalForStage(5)).toBe(30);
      expect(getIntervalForStage(10)).toBe(30);
    });

    it('calculates the correct next review timestamp for each interval', () => {
      const baseIso = '2026-10-19T10:00:00.000Z';
      const d1 = calculateNextReviewDate(baseIso, 1);
      expect(d1).toBe('2026-10-20T10:00:00.000Z');

      const d3 = calculateNextReviewDate(baseIso, 3);
      expect(d3).toBe('2026-10-22T10:00:00.000Z');

      const d7 = calculateNextReviewDate(baseIso, 7);
      expect(d7).toBe('2026-10-26T10:00:00.000Z');

      const d14 = calculateNextReviewDate(baseIso, 14);
      expect(d14).toBe('2026-11-02T10:00:00.000Z');

      const d30 = calculateNextReviewDate(baseIso, 30);
      expect(d30).toBe('2026-11-18T10:00:00.000Z');
    });

    it('handles leap years and month rollovers safely via UTC date arithmetic', () => {
      const febDate = '2028-02-28T00:00:00.000Z'; // 2028 is a leap year
      const nextDay = calculateNextReviewDate(febDate, 1);
      expect(nextDay).toBe('2028-02-29T00:00:00.000Z');

      const yearRoll = calculateNextReviewDate('2026-12-30T12:00:00.000Z', 3);
      expect(yearRoll).toBe('2027-01-02T12:00:00.000Z');
    });

    it('returns null and does not crash when passed invalid date strings', () => {
      expect(calculateNextReviewDate('invalid-date', 1)).toBeNull();
      expect(calculateNextReviewDate('', 3)).toBeNull();
    });
  });

  describe('Due Date Evaluation', () => {
    it('is not due before the scheduled review date', () => {
      const review: SpacedReviewRecord = {
        problemId: 'two-sum',
        completionDate: '2026-10-19T10:00:00.000Z',
        stage: 0,
        intervalDays: 1,
        nextReviewDate: '2026-10-20T10:00:00.000Z',
        reviewCount: 0
      };

      const refDateBefore = new Date('2026-10-20T09:59:59.000Z');
      const status = evaluateReviewDueStatus(review, refDateBefore);
      expect(status.isDue).toBe(false);
      expect(status.daysOverdue).toBe(0);
      expect(status.daysUntilDue).toBe(1);
    });

    it('becomes due exactly when the review date arrives and calculates days overdue', () => {
      const review: SpacedReviewRecord = {
        problemId: 'two-sum',
        completionDate: '2026-10-19T10:00:00.000Z',
        stage: 0,
        intervalDays: 1,
        nextReviewDate: '2026-10-20T10:00:00.000Z',
        reviewCount: 0
      };

      const refDateExact = new Date('2026-10-20T10:00:00.000Z');
      const statusExact = evaluateReviewDueStatus(review, refDateExact);
      expect(statusExact.isDue).toBe(true);
      expect(statusExact.daysOverdue).toBe(0);

      const refDate2DaysLater = new Date('2026-10-22T10:00:00.000Z');
      const statusOverdue = evaluateReviewDueStatus(review, refDate2DaysLater);
      expect(statusOverdue.isDue).toBe(true);
      expect(statusOverdue.daysOverdue).toBe(2);
    });

    it('classifies missing legacy timestamps as review date unavailable instead of guessing', () => {
      const legacyReview: SpacedReviewRecord = {
        problemId: 'legacy-prob',
        completionDate: '',
        stage: 0,
        intervalDays: 1,
        nextReviewDate: null,
        reviewCount: 0,
        reviewDateUnavailable: true
      };

      const status = evaluateReviewDueStatus(legacyReview, new Date('2026-10-20T10:00:00.000Z'));
      expect(status.isDue).toBe(false);
      expect(status.isUnavailable).toBe(true);
    });
  });

  describe('Storage Persistence & Sync Contract', () => {
    it('persists review schedule across reloads and syncs with completions', () => {
      const completions = new Map<string, ProblemCompletionRecord>([
        [
          'two-sum',
          {
            problemId: 'two-sum',
            completedAt: '2026-10-19T12:00:00.000Z',
            highestHintLevel: 'nudge',
            selfReported: true
          }
        ]
      ]);

      const initialReviews = syncSpacedReviewsWithCompletions(completions, new Map());
      saveSpacedReviews(initialReviews);

      const reloaded = loadSpacedReviews();
      expect(reloaded.has('two-sum')).toBe(true);
      const rec = reloaded.get('two-sum')!;
      expect(rec.stage).toBe(0);
      expect(rec.intervalDays).toBe(1);
      expect(rec.nextReviewDate).toBe('2026-10-20T12:00:00.000Z');
      expect(rec.reviewCount).toBe(0);
    });

    it('advances review stage and updates interval upon explicit review completion', () => {
      scheduleSpacedReview('two-sum', '2026-10-19T10:00:00.000Z');
      const review1 = recordReviewCompletion('two-sum', '2026-10-20T10:00:00.000Z');

      expect(review1).not.toBeNull();
      expect(review1!.stage).toBe(1);
      expect(review1!.intervalDays).toBe(3);
      expect(review1!.reviewCount).toBe(1);
      expect(review1!.lastReviewedDate).toBe('2026-10-20T10:00:00.000Z');
      expect(review1!.nextReviewDate).toBe('2026-10-23T10:00:00.000Z');

      // Second review
      const review2 = recordReviewCompletion('two-sum', '2026-10-23T10:00:00.000Z');
      expect(review2!.stage).toBe(2);
      expect(review2!.intervalDays).toBe(7);
      expect(review2!.reviewCount).toBe(2);
      expect(review2!.nextReviewDate).toBe('2026-10-30T10:00:00.000Z');
    });

    it('prevents accidental rapid double-advancing within 1 second (idempotency)', () => {
      scheduleSpacedReview('two-sum', '2026-10-19T10:00:00.000Z');
      const first = recordReviewCompletion('two-sum', '2026-10-20T10:00:00.000Z');
      const second = recordReviewCompletion('two-sum', '2026-10-20T10:00:00.500Z'); // 500ms later

      expect(second!.stage).toBe(first!.stage);
      expect(second!.reviewCount).toBe(first!.reviewCount);
    });

    it('removes review schedule when problem completion is undone', () => {
      recordLearningEvent({
        type: 'problem_completed',
        targetId: 'two-sum',
        targetType: 'problem',
        metadata: { selfReported: true }
      });

      let reviews = loadSpacedReviews();
      expect(reviews.has('two-sum')).toBe(true);

      recordLearningEvent({
        type: 'problem_uncompleted',
        targetId: 'two-sum',
        targetType: 'problem'
      });

      reviews = loadSpacedReviews();
      expect(reviews.has('two-sum')).toBe(false);
    });

    it('clears spaced reviews when resetUserStats is called', () => {
      scheduleSpacedReview('two-sum', '2026-10-19T10:00:00.000Z');
      expect(loadSpacedReviews().has('two-sum')).toBe(true);

      resetUserStats();
      expect(loadSpacedReviews().size).toBe(0);
    });
  });
});

describe('Milestone 3: Concept-to-Problem Bridges', () => {
  it('maps known concepts to their verified practice problems', () => {
    const bridgeTwoPointers = getConceptProblemBridge('two-pointers', PROBLEMS);
    expect(bridgeTwoPointers).not.toBeNull();
    expect(['three-sum', 'trapping-rain-water']).toContain(bridgeTwoPointers!.id);

    const bridgeStack = getConceptProblemBridge('stack', PROBLEMS);
    expect(bridgeStack).not.toBeNull();
    expect(['valid-parentheses', 'trapping-rain-water']).toContain(bridgeStack!.id);

    const bridgeHashing = getConceptProblemBridge('hashing', PROBLEMS);
    expect(bridgeHashing).not.toBeNull();
    expect(['two-sum', 'longest-substring-without-repeating-characters']).toContain(bridgeHashing!.id);
  });

  it('prefers uncompleted problems over already-completed ones', () => {
    const completed = new Set(['three-sum']);
    const bridge = getConceptProblemBridge('two-pointers', PROBLEMS, completed);
    expect(bridge?.id).toBe('trapping-rain-water');
  });

  it('truthfully returns null when no matching problem exists (no hallucinations)', () => {
    const bridgeNonExistent = getConceptProblemBridge('non-existent-concept', PROBLEMS);
    expect(bridgeNonExistent).toBeNull();

    // Concepts without current library problems
    const bridgeTrees = getConceptProblemBridge('trees', PROBLEMS);
    expect(bridgeTrees).toBeNull();
  });
});

describe('Milestone 3: Adaptive Recommendations Engine', () => {
  const emptyStats: UserStats = {
    problemsPracticed: 0,
    conceptsReviewed: 0,
    currentStreak: 0,
    weakAreas: [],
    recentlyStudied: [],
    recommendedNext: []
  };

  it('recommends weak-topic problems with highest priority when evidence exists', () => {
    const statsWithWeakness: UserStats = {
      ...emptyStats,
      weakAreas: [
        {
          topic: 'Two Pointers',
          reason: 'Level 3+ hints in 2 of 3 sessions',
          urgency: 'High'
        }
      ]
    };

    const recs = generateAdaptiveRecommendations({
      allProblems: PROBLEMS,
      allConcepts: CONCEPTS,
      stats: statsWithWeakness,
      limit: 3
    });

    expect(recs.length).toBeGreaterThan(0);
    const topRec = recs[0];
    expect(topRec.category).toBe('weak_topic');
    expect(topRec.priority).toBe(1);
    expect(topRec.topic).toBe('Two Pointers');
    expect(['three-sum', 'trapping-rain-water']).toContain(topRec.problemId);
  });

  it('excludes already-completed problems from ordinary practice recommendations', () => {
    const completions = new Map<string, ProblemCompletionRecord>([
      ['two-sum', { problemId: 'two-sum', completedAt: '2026-10-18T10:00:00.000Z', highestHintLevel: null, selfReported: true }],
      ['three-sum', { problemId: 'three-sum', completedAt: '2026-10-18T11:00:00.000Z', highestHintLevel: null, selfReported: true }]
    ]);

    const recs = generateAdaptiveRecommendations({
      allProblems: PROBLEMS,
      allConcepts: CONCEPTS,
      stats: emptyStats,
      completions,
      limit: 5
    });

    const recommendedIds = recs.map(r => r.problemId);
    expect(recommendedIds).not.toContain('two-sum');
    expect(recommendedIds).not.toContain('three-sum');
  });

  it('includes completed problems in the review category when they are due for review', () => {
    const reviews = new Map<string, SpacedReviewRecord>([
      [
        'two-sum',
        {
          problemId: 'two-sum',
          completionDate: '2026-10-18T10:00:00.000Z',
          stage: 0,
          intervalDays: 1,
          nextReviewDate: '2026-10-19T10:00:00.000Z', // due today
          reviewCount: 0
        }
      ]
    ]);

    const completions = new Map<string, ProblemCompletionRecord>([
      ['two-sum', { problemId: 'two-sum', completedAt: '2026-10-18T10:00:00.000Z', highestHintLevel: null, selfReported: true }]
    ]);

    const recs = generateAdaptiveRecommendations({
      allProblems: PROBLEMS,
      allConcepts: CONCEPTS,
      stats: emptyStats,
      completions,
      reviews,
      referenceDate: new Date('2026-10-19T12:00:00.000Z'),
      limit: 3
    });

    const reviewRec = recs.find(r => r.problemId === 'two-sum');
    expect(reviewRec).toBeDefined();
    expect(reviewRec?.category).toBe('review');
    expect(reviewRec?.priority).toBe(3);
  });

  it('excludes the currently open problem from recommendations', () => {
    const recs = generateAdaptiveRecommendations({
      allProblems: PROBLEMS,
      allConcepts: CONCEPTS,
      stats: emptyStats,
      currentProblemId: 'two-sum',
      limit: 3
    });

    const recommendedIds = recs.map(r => r.problemId);
    expect(recommendedIds).not.toContain('two-sum');
  });

  it('does not produce weak-topic recommendations when diagnostic evidence is lacking', () => {
    const recs = generateAdaptiveRecommendations({
      allProblems: PROBLEMS,
      allConcepts: CONCEPTS,
      stats: emptyStats, // no weakAreas
      limit: 3
    });

    const weakRecs = recs.filter(r => r.category === 'weak_topic');
    expect(weakRecs.length).toBe(0);
    // All fall back to general practice
    expect(recs.every(r => r.category === 'practice')).toBe(true);
  });

  it('bridges recently studied concepts into problem recommendations', () => {
    const events: LearningEvent[] = [
      {
        id: 'evt-1',
        type: 'concept_studied',
        targetId: 'sliding-window',
        targetType: 'concept',
        timestamp: '2026-10-19T10:00:00.000Z'
      }
    ];

    const recs = generateAdaptiveRecommendations({
      allProblems: PROBLEMS,
      allConcepts: CONCEPTS,
      stats: emptyStats,
      events,
      limit: 3
    });

    const bridgeRec = recs.find(r => r.category === 'concept_bridge');
    expect(bridgeRec).toBeDefined();
    expect(bridgeRec?.problemId).toBe('longest-substring-without-repeating-characters');
    expect(bridgeRec?.conceptId).toBe('sliding-window');
  });

  it('produces stable, deterministic ordering across repeated calls', () => {
    const params = {
      allProblems: PROBLEMS,
      allConcepts: CONCEPTS,
      stats: emptyStats,
      limit: 3
    };

    const run1 = generateAdaptiveRecommendations(params).map(r => r.problemId);
    const run2 = generateAdaptiveRecommendations(params).map(r => r.problemId);
    const run3 = generateAdaptiveRecommendations(params).map(r => r.problemId);

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
  });

  it('handles empty library or insufficient problems safely without crashing', () => {
    const recs = generateAdaptiveRecommendations({
      allProblems: [],
      allConcepts: [],
      stats: emptyStats,
      limit: 3
    });

    expect(recs).toEqual([]);
  });
});
