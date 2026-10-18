import {
  Problem,
  Concept,
  UserStats,
  LearningEvent,
  ProblemCompletionRecord,
  SpacedReviewRecord,
  ProblemRecommendation,
  RecommendationCategory
} from '../types';

export const SPACED_REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;

/**
 * Explicit mapping connecting 14 core DSA concepts to real problem library IDs.
 * Prefer explicit mappings to avoid brittle or arbitrary title string matching.
 */
export const CONCEPT_PROBLEM_MAP: Record<string, string[]> = {
  'arrays': ['two-sum', 'three-sum', 'trapping-rain-water'],
  'strings': ['longest-substring-without-repeating-characters', 'valid-parentheses'],
  'hashing': ['two-sum', 'longest-substring-without-repeating-characters'],
  'two-pointers': ['three-sum', 'trapping-rain-water'],
  'sliding-window': ['longest-substring-without-repeating-characters'],
  'stack': ['valid-parentheses', 'trapping-rain-water'],
  'queue': ['number-of-islands'],
  'linked-list': [],
  'binary-search': [],
  'trees': [],
  'graphs': ['number-of-islands'],
  'greedy': [],
  'backtracking': [],
  'dynamic-programming': ['coin-change', 'trapping-rain-water']
};

/**
 * Calculates next review timestamp given base date and interval in days.
 * Returns ISO string, or null if base date is invalid.
 */
export function calculateNextReviewDate(baseIsoOrDate: string | Date, intervalDays: number): string | null {
  const date = typeof baseIsoOrDate === 'string' ? new Date(baseIsoOrDate) : baseIsoOrDate;
  if (isNaN(date.getTime())) return null;

  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + intervalDays);
  return next.toISOString();
}

/**
 * Computes interval days for a given review stage.
 */
export function getIntervalForStage(stage: number): number {
  const boundedStage = Math.max(0, stage);
  if (boundedStage >= SPACED_REVIEW_INTERVALS.length) {
    return SPACED_REVIEW_INTERVALS[SPACED_REVIEW_INTERVALS.length - 1]; // 30 days
  }
  return SPACED_REVIEW_INTERVALS[boundedStage];
}

/**
 * Checks if a review record is due relative to a reference date.
 * If legacy record has missing or invalid timestamp, classifies as unavailable without guessing.
 */
export function evaluateReviewDueStatus(
  review: SpacedReviewRecord,
  referenceDate: Date = new Date()
): {
  isDue: boolean;
  daysOverdue: number;
  daysUntilDue: number;
  isUnavailable: boolean;
} {
  if (review.reviewDateUnavailable || !review.nextReviewDate) {
    return {
      isDue: false,
      daysOverdue: 0,
      daysUntilDue: 0,
      isUnavailable: true
    };
  }

  const nextTime = new Date(review.nextReviewDate).getTime();
  if (isNaN(nextTime)) {
    return {
      isDue: false,
      daysOverdue: 0,
      daysUntilDue: 0,
      isUnavailable: true
    };
  }

  const refTime = referenceDate.getTime();
  const diffMs = refTime - nextTime;
  const isDue = diffMs >= 0;

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOverdue = isDue ? Math.floor(diffMs / msPerDay) : 0;
  const daysUntilDue = !isDue ? Math.ceil(Math.abs(diffMs) / msPerDay) : 0;

  return {
    isDue,
    daysOverdue,
    daysUntilDue,
    isUnavailable: false
  };
}

/**
 * Synchronizes spaced review records with persisted problem completions.
 * Preserves existing review progress while initializing new completions and removing uncompleted ones.
 */
export function syncSpacedReviewsWithCompletions(
  completions: Map<string, ProblemCompletionRecord>,
  existingReviews: Map<string, SpacedReviewRecord>
): Map<string, SpacedReviewRecord> {
  const updated = new Map<string, SpacedReviewRecord>();

  for (const [problemId, completion] of completions.entries()) {
    const existing = existingReviews.get(problemId);
    if (existing) {
      // Retain existing review record
      updated.set(problemId, existing);
    } else {
      // Initialize new review record from completion record
      const isValidTimestamp = completion.completedAt && !isNaN(new Date(completion.completedAt).getTime());
      if (isValidTimestamp) {
        const intervalDays = getIntervalForStage(0);
        const nextReviewDate = calculateNextReviewDate(completion.completedAt, intervalDays);
        updated.set(problemId, {
          problemId,
          completionDate: completion.completedAt,
          stage: 0,
          intervalDays,
          nextReviewDate,
          reviewCount: 0,
          reviewDateUnavailable: false
        });
      } else {
        // Legacy completion with no usable timestamp
        updated.set(problemId, {
          problemId,
          completionDate: '',
          stage: 0,
          intervalDays: getIntervalForStage(0),
          nextReviewDate: null,
          reviewCount: 0,
          reviewDateUnavailable: true
        });
      }
    }
  }

  return updated;
}

/**
 * Finds due reviews among all problems.
 */
export function getDueReviews(
  allProblems: Problem[],
  reviews: Map<string, SpacedReviewRecord>,
  referenceDate: Date = new Date()
): {
  problem: Problem;
  review: SpacedReviewRecord;
  daysOverdue: number;
}[] {
  const problemMap = new Map<string, Problem>(allProblems.map(p => [p.id, p]));
  const dueList: { problem: Problem; review: SpacedReviewRecord; daysOverdue: number }[] = [];

  for (const review of reviews.values()) {
    const status = evaluateReviewDueStatus(review, referenceDate);
    if (status.isDue) {
      const problem = problemMap.get(review.problemId);
      if (problem) {
        dueList.push({
          problem,
          review,
          daysOverdue: status.daysOverdue
        });
      }
    }
  }

  // Deterministically sort: greatest daysOverdue first, then by problem title
  dueList.sort((a, b) => {
    if (b.daysOverdue !== a.daysOverdue) {
      return b.daysOverdue - a.daysOverdue;
    }
    return a.problem.title.localeCompare(b.problem.title);
  });

  return dueList;
}

/**
 * Finds a relevant practice problem for a studied concept.
 * Returns null if no reliable mapping exists (no hallucinations).
 */
export function getConceptProblemBridge(
  conceptId: string,
  allProblems: Problem[],
  completedProblemIds: Set<string> = new Set()
): Problem | null {
  const mappedIds = CONCEPT_PROBLEM_MAP[conceptId] || [];
  const problemMap = new Map<string, Problem>(allProblems.map(p => [p.id, p]));

  // 1. Look for uncompleted problems in explicit mapping
  for (const pid of mappedIds) {
    if (!completedProblemIds.has(pid)) {
      const prob = problemMap.get(pid);
      if (prob) return prob;
    }
  }

  // 2. Look for any completed problem in explicit mapping if all are completed
  for (const pid of mappedIds) {
    const prob = problemMap.get(pid);
    if (prob) return prob;
  }

  // 3. Fallback: check custom/library problems with tags exactly matching concept name
  for (const prob of allProblems) {
    if (!completedProblemIds.has(prob.id) && prob.tags.some(t => t.toLowerCase() === conceptId.toLowerCase())) {
      return prob;
    }
  }

  return null;
}

export interface RecommendationEngineParams {
  allProblems: Problem[];
  allConcepts: Concept[];
  stats: UserStats;
  events?: LearningEvent[];
  completions?: Map<string, ProblemCompletionRecord>;
  reviews?: Map<string, SpacedReviewRecord>;
  currentProblemId?: string;
  referenceDate?: Date;
  limit?: number;
}

/**
 * Deterministically generates adaptive problem recommendations based strictly on stored evidence.
 * Priority:
 * 1. Topics explicitly identified as 'Needs Practice' by the weakness detector.
 * 2. Relevant concept-study or quiz activity (Concept-to-Problem bridges).
 * 3. Due spaced review problems.
 * 4. General practice matching learner difficulty progression.
 */
export function generateAdaptiveRecommendations({
  allProblems,
  allConcepts,
  stats,
  events = [],
  completions = new Map(),
  reviews = new Map(),
  currentProblemId,
  referenceDate = new Date(),
  limit = 3
}: RecommendationEngineParams): ProblemRecommendation[] {
  const recommendations: ProblemRecommendation[] = [];
  const recommendedIds = new Set<string>();
  const completedIds = new Set<string>(completions.keys());

  if (currentProblemId) {
    recommendedIds.add(currentProblemId);
  }

  const problemMap = new Map<string, Problem>(allProblems.map(p => [p.id, p]));
  const conceptMap = new Map<string, Concept>(allConcepts.map(c => [c.id, c]));

  // Difficulty weighting for deterministic tie-breaking
  const difficultyWeight: Record<string, number> = {
    'Easy': 1,
    'Medium': 2,
    'Hard': 3
  };

  // -------------------------------------------------------------
  // Priority 1: Topics explicitly identified as 'Needs Practice'
  // -------------------------------------------------------------
  const confirmedWeaknesses = (stats.weakAreas || []).filter(w => w.urgency === 'High' || w.urgency === 'Medium');

  for (const weak of confirmedWeaknesses) {
    if (recommendations.length >= limit) break;

    // Find candidate uncompleted problems matching the weak topic tag or category
    const candidates = allProblems.filter(p =>
      !completedIds.has(p.id) &&
      !recommendedIds.has(p.id) &&
      (p.tags.includes(weak.topic) || p.category.toLowerCase() === weak.topic.toLowerCase())
    );

    // Deterministic sort: Easy first, then Medium, then Hard, then by ID
    candidates.sort((a, b) => {
      const diffA = difficultyWeight[a.difficulty] || 2;
      const diffB = difficultyWeight[b.difficulty] || 2;
      if (diffA !== diffB) return diffA - diffB;
      return a.id.localeCompare(b.id);
    });

    for (const match of candidates) {
      if (recommendations.length >= limit) break;
      recommendedIds.add(match.id);
      recommendations.push({
        problemId: match.id,
        problem: match,
        category: 'weak_topic',
        topic: weak.topic,
        reason: `Target your diagnostic weakness in ${weak.topic}.`,
        evidence: `Weakness detected: requested level 3+ hints in ≥ 50% of recorded ${weak.topic} sessions.`,
        priority: 1
      });
    }
  }

  // -------------------------------------------------------------
  // Priority 2: Concept-to-Problem Bridges from recent study/quizzes
  // -------------------------------------------------------------
  if (recommendations.length < limit && events.length > 0) {
    // Find unique recent concepts studied or quizzed
    const recentConceptEvents = events.filter(e =>
      e.targetType === 'concept' &&
      (e.type === 'concept_studied' || e.type === 'quiz_attempted') &&
      e.targetId
    );

    const visitedConceptIds = new Set<string>();
    for (const evt of recentConceptEvents) {
      if (recommendations.length >= limit) break;
      if (visitedConceptIds.has(evt.targetId)) continue;
      visitedConceptIds.add(evt.targetId);

      const concept = conceptMap.get(evt.targetId);
      if (!concept) continue;

      const bridgeProblem = getConceptProblemBridge(concept.id, allProblems, completedIds);
      if (bridgeProblem && !recommendedIds.has(bridgeProblem.id) && !completedIds.has(bridgeProblem.id)) {
        recommendedIds.add(bridgeProblem.id);

        const isQuiz = evt.type === 'quiz_attempted';
        const quizCorrect = evt.metadata?.quizCorrect;
        const evidenceNote = isQuiz
          ? quizCorrect === false
            ? `Reinforce understanding after concept checkpoint attempt.`
            : `Hands-on practice following concept quiz (note: single checkpoint does not imply complete mastery).`
          : `Suggested practice problem connected to studied concept '${concept.name}'.`;

        recommendations.push({
          problemId: bridgeProblem.id,
          problem: bridgeProblem,
          category: 'concept_bridge',
          conceptId: concept.id,
          topic: concept.name,
          reason: `Bridge from ${concept.name} to hands-on problem solving.`,
          evidence: evidenceNote,
          priority: 2
        });
      }
    }
  }

  // -------------------------------------------------------------
  // Priority 3: Due Spaced Reviews
  // -------------------------------------------------------------
  if (recommendations.length < limit && reviews.size > 0) {
    const dueReviews = getDueReviews(allProblems, reviews, referenceDate);
    for (const due of dueReviews) {
      if (recommendations.length >= limit) break;
      if (!recommendedIds.has(due.problem.id)) {
        recommendedIds.add(due.problem.id);
        const overdueText = due.daysOverdue > 0
          ? `${due.daysOverdue} day${due.daysOverdue === 1 ? '' : 's'} overdue`
          : 'due today';

        recommendations.push({
          problemId: due.problem.id,
          problem: due.problem,
          category: 'review',
          reason: `Scheduled spaced review (${due.review.intervalDays}-day interval, ${overdueText}).`,
          evidence: `Completed problem review interval reached to combat retention decay.`,
          priority: 3
        });
      }
    }
  }

  // -------------------------------------------------------------
  // Priority 4: General Uncompleted Practice (Appropriate Difficulty)
  // -------------------------------------------------------------
  if (recommendations.length < limit) {
    const uncompleted = allProblems.filter(p => !completedIds.has(p.id) && !recommendedIds.has(p.id));

    // Sort by appropriate difficulty (Easy first, then Medium, then Hard), then by ID
    uncompleted.sort((a, b) => {
      const diffA = difficultyWeight[a.difficulty] || 2;
      const diffB = difficultyWeight[b.difficulty] || 2;
      if (diffA !== diffB) return diffA - diffB;
      return a.id.localeCompare(b.id);
    });

    for (const prob of uncompleted) {
      if (recommendations.length >= limit) break;
      recommendedIds.add(prob.id);
      recommendations.push({
        problemId: prob.id,
        problem: prob,
        category: 'practice',
        topic: prob.category,
        reason: `Build foundational problem solving patterns with ${prob.title}.`,
        evidence: `Standard practice curriculum sequence for interview readiness.`,
        priority: 4
      });
    }
  }

  return recommendations;
}
