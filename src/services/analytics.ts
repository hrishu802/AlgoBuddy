import {
  LearningEvent,
  Problem,
  Concept,
  UserStats,
  TopicWeaknessReport,
  HintLevel,
  AppMode,
  ProblemCompletionRecord
} from '../types';
import { getCompletedProblemIdsFromEvents } from './storage';

export const MIN_EVALUATION_SESSIONS = 3;

const HINT_TIER_DEPTH: Record<HintLevel, number> = {
  nudge: 1,
  hint: 2,
  strong_hint: 3,
  explain: 4,
  solution: 5
};

export function hintLevelToDepth(level: HintLevel | null | undefined): number | null {
  if (!level || !HINT_TIER_DEPTH[level]) return null;
  return HINT_TIER_DEPTH[level];
}

/**
 * Returns YYYY-MM-DD in the local timezone for a given Date or ISO string
 */
export function toLocalDateString(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Deterministically computes learning streak from timestamped qualifying events
 */
export function calculateStreak(events: LearningEvent[], referenceDate: Date = new Date()): number {
  if (!events || events.length === 0) return 0;

  // Filter out invalid dates and gather unique active calendar dates from valid learning activity
  const uniqueDates = new Set<string>();
  for (const evt of events) {
    if (!evt.timestamp) continue;
    // Exclude undo actions from qualifying as learning activity
    if (evt.type === 'problem_uncompleted') continue;

    const dateStr = toLocalDateString(evt.timestamp);
    if (dateStr) {
      uniqueDates.add(dateStr);
    }
  }

  if (uniqueDates.size === 0) return 0;

  const todayStr = toLocalDateString(referenceDate);
  if (!todayStr) return 0;

  const refParts = todayStr.split('-').map(Number);
  if (refParts.length !== 3 || refParts.some(isNaN)) return 0;

  // Anchor to local noon (12:00:00) so stepping 1 calendar day backwards never slips past midnight due to DST +/- 1hr
  const todayNoon = new Date(refParts[0], refParts[1] - 1, refParts[2], 12, 0, 0);
  const yesterdayNoon = new Date(todayNoon);
  yesterdayNoon.setDate(yesterdayNoon.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterdayNoon);

  // If there's no activity today and no activity yesterday, streak is broken (0)
  if (!uniqueDates.has(todayStr) && !uniqueDates.has(yesterdayStr)) {
    return 0;
  }

  // Count backwards day by day starting from the most recent active date (today or yesterday)
  let checkDate = new Date(uniqueDates.has(todayStr) ? todayNoon : yesterdayNoon);
  let streak = 0;

  while (true) {
    const checkStr = toLocalDateString(checkDate);
    if (uniqueDates.has(checkStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Detects topic-level weaknesses using recorded learning evidence and minimum thresholds
 */
export function detectTopicWeaknesses(
  events: LearningEvent[],
  allProblems: Problem[],
  persistedCompletions?: Map<string, ProblemCompletionRecord>
): TopicWeaknessReport[] {
  const problemMap = new Map<string, Problem>(allProblems.map(p => [p.id, p]));

  // Group events by problemId to analyze sessions/attempts
  // A valid session requires substantive activity: hints, code analysis, stage progress, or completion
  interface ProblemSessionSummary {
    problemId: string;
    highestHint: HintLevel | null;
    completed: boolean;
    hasSubstantiveWork: boolean;
    lastTimestamp: string;
  }

  const problemSessions = new Map<string, ProblemSessionSummary>();

  // If persistent completions are provided, pre-seed completed problems so their evidence survives 500-event roll-off
  if (persistedCompletions) {
    for (const [pid, rec] of persistedCompletions.entries()) {
      problemSessions.set(pid, {
        problemId: pid,
        highestHint: rec.highestHintLevel ?? null,
        completed: true,
        hasSubstantiveWork: true,
        lastTimestamp: rec.completedAt
      });
    }
  }

  for (const evt of events) {
    if (evt.targetType !== 'problem' || !evt.targetId) continue;
    const pid = evt.targetId;
    if (!problemSessions.has(pid)) {
      problemSessions.set(pid, {
        problemId: pid,
        highestHint: null,
        completed: false,
        hasSubstantiveWork: false,
        lastTimestamp: evt.timestamp
      });
    }

    const session = problemSessions.get(pid)!;
    if (new Date(evt.timestamp).getTime() > new Date(session.lastTimestamp).getTime()) {
      session.lastTimestamp = evt.timestamp;
    }

    if (evt.type === 'problem_completed') {
      session.completed = true;
    } else if (evt.type === 'problem_uncompleted') {
      session.completed = false;
    } else if (
      evt.type === 'hint_requested' ||
      evt.type === 'code_analyzed' ||
      evt.type === 'stage_advanced'
    ) {
      session.hasSubstantiveWork = true;
    }

    // Inspect hint tier from event metadata or type
    const eventHint = (evt.metadata?.highestHintLevel as HintLevel) || (evt.metadata?.hintLevel as HintLevel);
    if (eventHint) {
      const currentDepth = hintLevelToDepth(session.highestHint) ?? 0;
      const newDepth = hintLevelToDepth(eventHint) ?? 0;
      if (newDepth > currentDepth) {
        session.highestHint = eventHint;
      }
    }
  }

  // Aggregate evidence by tag
  interface TagAggregate {
    tag: string;
    sessionCount: number;
    hintHeavyCount: number;
    completedCount: number;
    lastUpdated: string;
  }

  const tagAggregates = new Map<string, TagAggregate>();

  for (const session of problemSessions.values()) {
    // Only count problem sessions with substantive activity or completion
    const hasLearningWork = (hintLevelToDepth(session.highestHint) !== null) || session.hasSubstantiveWork;
    const isValidSession = session.completed || hasLearningWork;
    if (!isValidSession) continue;

    const problem = problemMap.get(session.problemId);
    if (!problem) continue;

    // Use actual problem tags; fallback to category if tags are missing; do not invent tags
    const rawTags = (problem.tags && problem.tags.length > 0)
      ? problem.tags
      : (problem.category ? [problem.category] : []);
    const tags = rawTags.filter(t => typeof t === 'string' && t.trim().length > 0);
    if (tags.length === 0) continue;

    const isHintHeavy = (hintLevelToDepth(session.highestHint) ?? 0) >= 3;

    for (const tag of tags) {
      if (!tagAggregates.has(tag)) {
        tagAggregates.set(tag, {
          tag,
          sessionCount: 0,
          hintHeavyCount: 0,
          completedCount: 0,
          lastUpdated: session.lastTimestamp
        });
      }

      const agg = tagAggregates.get(tag)!;
      agg.sessionCount += 1;
      if (isHintHeavy) {
        agg.hintHeavyCount += 1;
      }
      if (session.completed) {
        agg.completedCount += 1;
      }
      if (new Date(session.lastTimestamp).getTime() > new Date(agg.lastUpdated).getTime()) {
        agg.lastUpdated = session.lastTimestamp;
      }
    }
  }

  const reports: TopicWeaknessReport[] = [];

  for (const agg of tagAggregates.values()) {
    if (agg.sessionCount < MIN_EVALUATION_SESSIONS) {
      reports.push({
        topic: agg.tag,
        status: 'Insufficient Data',
        sessionCount: agg.sessionCount,
        hintHeavyCount: agg.hintHeavyCount,
        urgency: 'None',
        reason: `Not enough practice data: ${agg.sessionCount} of ${MIN_EVALUATION_SESSIONS} required sessions recorded for this topic.`,
        lastUpdated: agg.lastUpdated
      });
      continue;
    }

    const hintRatio = agg.hintHeavyCount / agg.sessionCount;

    if (hintRatio >= 0.5) {
      const urgency = hintRatio >= 0.75 ? 'High' : 'Medium';
      reports.push({
        topic: agg.tag,
        status: 'Needs Practice',
        sessionCount: agg.sessionCount,
        hintHeavyCount: agg.hintHeavyCount,
        urgency,
        reason: `${agg.tag} may need more practice: across ${agg.sessionCount} recorded sessions, you requested level 3+ hints in ${agg.hintHeavyCount} sessions.`,
        lastUpdated: agg.lastUpdated
      });
    } else if (hintRatio === 0 && agg.completedCount > 0) {
      reports.push({
        topic: agg.tag,
        status: 'Proficient',
        sessionCount: agg.sessionCount,
        hintHeavyCount: 0,
        urgency: 'Low',
        reason: `Demonstrated independence: across ${agg.sessionCount} sessions, you solved problems with minimal or no hint reliance.`,
        lastUpdated: agg.lastUpdated
      });
    } else {
      reports.push({
        topic: agg.tag,
        status: 'Developing',
        sessionCount: agg.sessionCount,
        hintHeavyCount: agg.hintHeavyCount,
        urgency: 'Low',
        reason: agg.completedCount > 0
          ? `Progressing well: across ${agg.sessionCount} sessions, you requested higher hint tiers in ${agg.hintHeavyCount} sessions.`
          : `Progressing well: across ${agg.sessionCount} recorded practice sessions with minimal hint reliance (no completed solves recorded yet).`,
        lastUpdated: agg.lastUpdated
      });
    }
  }

  // Sort reports: 'Needs Practice' first (High urgency, then Medium), then 'Developing', then 'Proficient', then 'Insufficient Data'
  const rank: Record<string, number> = {
    'Needs Practice-High': 1,
    'Needs Practice-Medium': 2,
    'Needs Practice-Low': 3,
    'Developing-Low': 4,
    'Proficient-Low': 5,
    'Insufficient Data-None': 6
  };

  reports.sort((a, b) => {
    const keyA = `${a.status}-${a.urgency}`;
    const keyB = `${b.status}-${b.urgency}`;
    return (rank[keyA] ?? 99) - (rank[keyB] ?? 99);
  });

  return reports;
}

/**
 * Computes full UserStats deterministically from recorded LearningEvents
 */
export function computeUserStats(
  events: LearningEvent[],
  allProblems: Problem[],
  allConcepts: Concept[],
  referenceDate: Date = new Date(),
  persistedCompletions?: Map<string, ProblemCompletionRecord>
): UserStats {
  const completedProblemIds = persistedCompletions
    ? new Set(persistedCompletions.keys())
    : getCompletedProblemIdsFromEvents(events);
  const problemMap = new Map<string, Problem>(allProblems.map(p => [p.id, p]));
  const conceptMap = new Map<string, Concept>(allConcepts.map(c => [c.id, c]));

  // Difficulty breakdown
  let easy = 0;
  let medium = 0;
  let hard = 0;

  for (const pid of completedProblemIds) {
    const prob = problemMap.get(pid);
    if (prob) {
      if (prob.difficulty === 'Easy') easy++;
      else if (prob.difficulty === 'Medium') medium++;
      else if (prob.difficulty === 'Hard') hard++;
    }
  }

  // Concepts reviewed: distinct concept IDs with concept_studied or quiz_attempted
  const reviewedConceptIds = new Set<string>();
  for (const evt of events) {
    if (evt.targetType === 'concept' && (evt.type === 'concept_studied' || evt.type === 'quiz_attempted')) {
      reviewedConceptIds.add(evt.targetId);
    }
  }

  // Streak
  const currentStreak = calculateStreak(events, referenceDate);

  // Hint reliance across evaluated completed problem sessions
  let totalHintDepth = 0;
  let evaluatedSessions = 0;

  // Track highest hint per completed problem
  // Distinguish confirmed 0-hint solve (highestHintLevel === null) from missing/unknown hint history (undefined)
  const completedHighestHint = new Map<string, HintLevel | null | undefined>();
  // Pre-seed from persisted completions if provided (survives 500-event roll-off)
  if (persistedCompletions) {
    for (const [pid, rec] of persistedCompletions.entries()) {
      if (rec.highestHintLevel !== undefined) {
        completedHighestHint.set(pid, rec.highestHintLevel);
      }
    }
  }
  for (const evt of events) {
    if (evt.type === 'problem_completed' && evt.targetType === 'problem' && completedProblemIds.has(evt.targetId)) {
      if (!completedHighestHint.has(evt.targetId)) {
        if (evt.metadata && 'highestHintLevel' in evt.metadata) {
          completedHighestHint.set(
            evt.targetId,
            (evt.metadata.highestHintLevel as HintLevel | null) ?? null
          );
        } else {
          // Check if any hint_requested events exist for this problem
          let maxHint: HintLevel | null = null;
          let hasHintEvent = false;
          for (const hEvt of events) {
            if (hEvt.targetType === 'problem' && hEvt.targetId === evt.targetId && hEvt.type === 'hint_requested') {
              hasHintEvent = true;
              const hLevel = (hEvt.metadata?.hintLevel || hEvt.metadata?.highestHintLevel) as HintLevel;
              if (hLevel) {
                const curD = hintLevelToDepth(maxHint) ?? 0;
                const newD = hintLevelToDepth(hLevel) ?? 0;
                if (newD > curD) maxHint = hLevel;
              }
            }
          }
          if (hasHintEvent && maxHint) {
            completedHighestHint.set(evt.targetId, maxHint);
          } else {
            // Missing historical hint tracking: mark undefined so it is not fabricated as 0
            completedHighestHint.set(evt.targetId, undefined);
          }
        }
      }
    }
  }

  for (const hint of completedHighestHint.values()) {
    if (hint === undefined) {
      // Untracked or missing historical hint data: exclude from evaluated sessions
      continue;
    }
    const depth = hintLevelToDepth(hint);
    if (depth !== null) {
      totalHintDepth += depth;
      evaluatedSessions++;
    } else {
      // Confirmed completed with 0 hints requested: depth is 0
      totalHintDepth += 0;
      evaluatedSessions++;
    }
  }

  const averageHintLevel = evaluatedSessions > 0
    ? Math.round((totalHintDepth / evaluatedSessions) * 10) / 10
    : null;

  const hintRelianceLabel = averageHintLevel !== null
    ? `Lvl ${averageHintLevel}`
    : '—';

  // Weak areas
  const allWeaknessReports = detectTopicWeaknesses(events, allProblems, persistedCompletions);
  const activeWeaknesses = allWeaknessReports
    .filter(r => r.status === 'Needs Practice')
    .map(r => ({
      topic: r.topic,
      reason: r.reason,
      urgency: r.urgency as 'High' | 'Medium' | 'Low'
    }));

  // Recently studied items (distinct, chronological order, max 6)
  const recentMap = new Map<string, { id: string; type: 'concept' | 'problem'; name: string; date: string; difficulty: string }>();

  // Events are ordered with newest first (unshifted)
  for (const evt of events) {
    const key = `${evt.targetType}-${evt.targetId}`;
    if (recentMap.has(key)) continue;

    const eventDate = new Date(evt.timestamp);
    const dateFormatted = !isNaN(eventDate.getTime())
      ? toLocalDateString(eventDate) === toLocalDateString(referenceDate)
        ? 'Today'
        : toLocalDateString(eventDate)
      : 'Recently';

    if (evt.targetType === 'problem') {
      const p = problemMap.get(evt.targetId);
      if (p) {
        recentMap.set(key, {
          id: p.id,
          type: 'problem',
          name: p.title,
          date: dateFormatted,
          difficulty: p.difficulty
        });
      }
    } else if (evt.targetType === 'concept') {
      const c = conceptMap.get(evt.targetId);
      if (c) {
        recentMap.set(key, {
          id: c.id,
          type: 'concept',
          name: c.name,
          date: dateFormatted,
          difficulty: c.difficulty
        });
      }
    }

    if (recentMap.size >= 6) break;
  }

  // Recommended next:
  // If active weaknesses exist, suggest uncompleted problems matching those weak topics
  const recommendedNext: UserStats['recommendedNext'] = [];
  const recommendedIds = new Set<string>();

  for (const weak of activeWeaknesses) {
    const matchingProblem = allProblems.find(
      p => !completedProblemIds.has(p.id) &&
        !recommendedIds.has(p.id) &&
        ((p.tags && p.tags.includes(weak.topic)) || p.category === weak.topic)
    );
    if (matchingProblem) {
      recommendedIds.add(matchingProblem.id);
      recommendedNext.push({
        id: matchingProblem.id,
        type: 'problem',
        name: matchingProblem.title,
        tag: weak.topic,
        reason: `Strengthen pattern mastery in ${weak.topic}.`,
        mode: 'problem'
      });
    }
  }

  // If fewer than 3 recommendations and we have problems, fill with uncompleted problems
  if (recommendedNext.length < 3) {
    for (const p of allProblems) {
      if (recommendedNext.length >= 3) break;
      if (!completedProblemIds.has(p.id) && !recommendedIds.has(p.id)) {
        recommendedIds.add(p.id);
        recommendedNext.push({
          id: p.id,
          type: 'problem',
          name: p.title,
          tag: p.tags[0] || p.category,
          reason: `Continue your interview preparation sequence.`,
          mode: 'problem'
        });
      }
    }
  }

  return {
    problemsPracticed: completedProblemIds.size,
    conceptsReviewed: Math.min(reviewedConceptIds.size, allConcepts.length),
    currentStreak,
    weakAreas: activeWeaknesses,
    recentlyStudied: Array.from(recentMap.values()),
    recommendedNext,
    hintReliance: {
      averageLevel: averageHintLevel,
      evaluatedSessions,
      label: hintRelianceLabel
    },
    difficultyBreakdown: {
      easy,
      medium,
      hard
    }
  };
}
