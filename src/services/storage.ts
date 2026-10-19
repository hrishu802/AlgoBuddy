import { 
  UserStats, 
  AISettings, 
  Problem, 
  MentorSession, 
  AppMode, 
  LearningEvent,
  ProblemCompletionRecord,
  CompletionVerification,
  HintLevel,
  SpacedReviewRecord
} from '../types';
import { PROBLEMS } from '../data/problems';
import { 
  calculateNextReviewDate, 
  getIntervalForStage, 
  syncSpacedReviewsWithCompletions 
} from './recommendations';

const STATS_KEY = 'algobuddy_user_stats';
const SETTINGS_KEY = 'algobuddy_settings';
const CUSTOM_PROBLEMS_KEY = 'algobuddy_custom_problems';
const SESSIONS_KEY = 'algobuddy_saved_sessions';
const EVENTS_KEY = 'algobuddy_learning_events';
const COMPLETIONS_KEY = 'algobuddy_problem_completions';
const REVIEWS_KEY = 'algobuddy_spaced_reviews';
const MAX_LEARNING_EVENTS = 500;

export const DEFAULT_STATS: UserStats = {
  problemsPracticed: 0,
  conceptsReviewed: 0,
  currentStreak: 0,
  weakAreas: [],
  recentlyStudied: [],
  recommendedNext: []
};

// Preserved sample data for demonstration/reference
export const SAMPLE_STATS: UserStats = {
  problemsPracticed: 18,
  conceptsReviewed: 9,
  currentStreak: 4,
  weakAreas: [
    {
      topic: 'Dynamic Programming State Transitions',
      reason: 'Frequent struggle converting recursive memoization to 1D tabulation.',
      urgency: 'High'
    },
    {
      topic: 'Monotonic Stack Invariants',
      reason: 'Struggled to identify when to use strictly decreasing vs non-increasing.',
      urgency: 'Medium'
    },
    {
      topic: 'Sliding Window with Negative Numbers',
      reason: 'Attempted two pointers when prefix sum + hash map was required.',
      urgency: 'Medium'
    }
  ],
  recentlyStudied: [
    {
      id: 'two-sum',
      type: 'problem',
      name: 'Two Sum',
      date: 'Today',
      difficulty: 'Easy'
    },
    {
      id: 'sliding-window',
      type: 'concept',
      name: 'Sliding Window',
      date: 'Yesterday',
      difficulty: 'Intermediate'
    },
    {
      id: 'coin-change',
      type: 'problem',
      name: 'Coin Change',
      date: '3 days ago',
      difficulty: 'Medium'
    },
    {
      id: 'trapping-rain-water',
      type: 'problem',
      name: 'Trapping Rain Water',
      date: '4 days ago',
      difficulty: 'Hard'
    }
  ],
  recommendedNext: [
    {
      id: 'three-sum',
      type: 'problem',
      name: '3Sum',
      tag: 'Two Pointers',
      reason: 'Solidify pair-sum to triplet-sum reduction with sorting.',
      mode: 'problem'
    },
    {
      id: 'stack',
      type: 'concept',
      name: 'Monotonic Stack',
      tag: 'Stack',
      reason: 'Strengthen weak area in Daily Temperatures and Next Greater Element.',
      mode: 'concept'
    },
    {
      id: 'number-of-islands',
      type: 'problem',
      name: 'Number of Islands',
      tag: 'Graphs / BFS',
      reason: 'Practice 2D connected components and visited array state.',
      mode: 'problem'
    }
  ]
};

export const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemma',
  gemmaProvider: 'huggingface',
  gemmaModel: 'google/gemma-3-12b-it',
  gemmaEndpoint: 'https://router.huggingface.co/v1',
  model: 'gemini-1.5-flash',
  mentorStrictness: 'strict'
};

export function loadUserStats(): UserStats {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_STATS;
    }
    const data = localStorage.getItem(STATS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return {
          problemsPracticed: typeof parsed.problemsPracticed === 'number' && !isNaN(parsed.problemsPracticed)
            ? Math.max(0, parsed.problemsPracticed)
            : 0,
          conceptsReviewed: typeof parsed.conceptsReviewed === 'number' && !isNaN(parsed.conceptsReviewed)
            ? Math.max(0, parsed.conceptsReviewed)
            : 0,
          currentStreak: typeof parsed.currentStreak === 'number' && !isNaN(parsed.currentStreak)
            ? Math.max(0, parsed.currentStreak)
            : 0,
          weakAreas: Array.isArray(parsed.weakAreas) ? parsed.weakAreas : [],
          recentlyStudied: Array.isArray(parsed.recentlyStudied) ? parsed.recentlyStudied : [],
          recommendedNext: Array.isArray(parsed.recommendedNext) ? parsed.recommendedNext : []
        };
      }
    }
  } catch (e) {
    console.error('Error loading stats from localStorage', e);
  }
  return DEFAULT_STATS;
}

export function saveUserStats(stats: UserStats): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    }
  } catch (e) {
    console.error('Error saving stats', e);
  }
}

export function resetUserStats(): UserStats {
  clearLearningEvents();
  clearProblemCompletions();
  clearSpacedReviews();
  saveUserStats(DEFAULT_STATS);
  return DEFAULT_STATS;
}

export function loadAISettings(): AISettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_SETTINGS;
    }
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        // Migrate legacy deprecated gemma2-9b-it settings to hosted Hugging Face
        if (parsed.gemmaModel === 'gemma2-9b-it' || !parsed.gemmaProvider) {
          parsed.gemmaProvider = 'huggingface';
          parsed.gemmaModel = 'google/gemma-3-12b-it';
          parsed.gemmaEndpoint = 'https://router.huggingface.co/v1';
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch (e) {
    console.error('Error loading settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveAISettings(settings: AISettings): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function loadCustomProblems(): Problem[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    const data = localStorage.getItem(CUSTOM_PROBLEMS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading custom problems', e);
  }
  return [];
}

export function saveCustomProblem(problem: Problem): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = loadCustomProblems();
      const filtered = current.filter(p => p.id !== problem.id);
      filtered.unshift(problem);
      localStorage.setItem(CUSTOM_PROBLEMS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Error saving custom problem', e);
  }
}

export function getAllProblems(): Problem[] {
  const custom = loadCustomProblems();
  return [...custom, ...PROBLEMS];
}

export function loadSavedSessions(): MentorSession[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    const data = localStorage.getItem(SESSIONS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading sessions', e);
  }
  return [];
}

export function findSavedSession(mode: AppMode, targetId?: string): MentorSession | undefined {
  const sessions = loadSavedSessions();
  if (mode === 'problem') {
    return sessions.find(s => s.mode === 'problem' && s.problemId === targetId);
  }
  if (mode === 'concept') {
    return sessions.find(s => s.mode === 'concept' && s.conceptId === targetId);
  }
  if (mode === 'code') {
    return sessions.find(s => s.mode === 'code' && (!targetId || s.problemId === targetId));
  }
  return undefined;
}

export function deleteSavedSession(sessionId: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = loadSavedSessions();
      const filtered = current.filter(s => s.id !== sessionId);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Error deleting session', e);
  }
}

export function saveMentorSession(session: MentorSession): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = loadSavedSessions();
      const filtered = current.filter(s => s.id !== session.id);
      filtered.unshift(session);
      // Keep max 20 recent sessions
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered.slice(0, 20)));
    }
  } catch (e) {
    console.error('Error saving session', e);
  }
}

export function loadLearningEvents(): LearningEvent[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    const data = localStorage.getItem(EVENTS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((evt): evt is LearningEvent => {
      return (
        evt &&
        typeof evt === 'object' &&
        typeof evt.id === 'string' &&
        typeof evt.type === 'string' &&
        typeof evt.targetId === 'string' &&
        typeof evt.targetType === 'string' &&
        typeof evt.timestamp === 'string' &&
        !isNaN(Date.parse(evt.timestamp))
      );
    });
  } catch (e) {
    console.error('Error loading learning events from localStorage', e);
    return [];
  }
}

export function saveLearningEvents(events: LearningEvent[]): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const bounded = events.slice(0, MAX_LEARNING_EVENTS);
      localStorage.setItem(EVENTS_KEY, JSON.stringify(bounded));
      return true;
    }
  } catch (e) {
    console.error('Error saving learning events to localStorage', e);
    return false;
  }
  return false;
}

export function clearLearningEvents(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(EVENTS_KEY);
    }
  } catch (e) {
    console.error('Error clearing learning events', e);
  }
}

export function reconstructCompletionsFromEvents(events: LearningEvent[]): Map<string, ProblemCompletionRecord> {
  // Break ties using original index (since events are prepended with unshift, larger index = earlier insertion)
  const indexed = events.map((evt, index) => ({ evt, index }));
  indexed.sort((a, b) => {
    const timeA = new Date(a.evt.timestamp).getTime();
    const timeB = new Date(b.evt.timestamp).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return b.index - a.index;
  });

  const completions = new Map<string, ProblemCompletionRecord>();
  for (const { evt } of indexed) {
    if (evt.type === 'problem_completed' && evt.targetType === 'problem') {
      completions.set(evt.targetId, {
        problemId: evt.targetId,
        completedAt: evt.timestamp,
        highestHintLevel: (evt.metadata?.highestHintLevel as HintLevel | null | undefined),
        selfReported: (evt.metadata?.selfReported as boolean) ?? true,
        verification: (evt.metadata?.verification as CompletionVerification) ?? 'self_reported'
      });
    } else if (evt.type === 'problem_uncompleted' && evt.targetType === 'problem') {
      completions.delete(evt.targetId);
    }
  }
  return completions;
}

export function loadProblemCompletions(): Map<string, ProblemCompletionRecord> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return new Map();
    }
    const data = localStorage.getItem(COMPLETIONS_KEY);
    if (data !== null) {
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const map = new Map<string, ProblemCompletionRecord>();
          for (const [key, val] of Object.entries(parsed)) {
            if (
              val &&
              typeof val === 'object' &&
              typeof (val as ProblemCompletionRecord).problemId === 'string' &&
              typeof (val as ProblemCompletionRecord).completedAt === 'string' &&
              !isNaN(Date.parse((val as ProblemCompletionRecord).completedAt))
            ) {
              map.set(key, val as ProblemCompletionRecord);
            }
          }
          return map;
        }
      } catch (parseErr) {
        console.error('Error parsing problem completions from localStorage', parseErr);
      }
      // If key existed but was invalid or corrupted, do not overwrite with stale migration events
      return new Map();
    }

    // Key is missing (null): perform one-time migration from legacy learning events if present
    const events = loadLearningEvents();
    const reconstructed = events.length > 0
      ? reconstructCompletionsFromEvents(events)
      : new Map<string, ProblemCompletionRecord>();

    // Mark key as initialized so migration never runs repeatedly on future visits
    saveProblemCompletions(reconstructed);
    return reconstructed;
  } catch (e) {
    console.error('Error loading problem completions from localStorage', e);
    return new Map();
  }
}

export function saveProblemCompletions(completions: Map<string, ProblemCompletionRecord>): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const obj: Record<string, ProblemCompletionRecord> = {};
      for (const [key, val] of completions.entries()) {
        obj[key] = val;
      }
      localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(obj));
      return true;
    }
  } catch (e) {
    console.error('Error saving problem completions to localStorage', e);
    return false;
  }
  return false;
}

export function clearProblemCompletions(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(COMPLETIONS_KEY);
    }
  } catch (e) {
    console.error('Error clearing problem completions', e);
  }
}

export function getCompletedProblemIdsFromEvents(events: LearningEvent[]): Set<string> {
  const reconstructed = reconstructCompletionsFromEvents(events);
  return new Set(reconstructed.keys());
}

export function getCompletedProblemIds(): Set<string> {
  const completions = loadProblemCompletions();
  return new Set(completions.keys());
}

export function loadSpacedReviews(): Map<string, SpacedReviewRecord> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return new Map();
    }
    const data = localStorage.getItem(REVIEWS_KEY);
    if (data !== null) {
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const map = new Map<string, SpacedReviewRecord>();
          for (const [key, val] of Object.entries(parsed)) {
            if (
              val &&
              typeof val === 'object' &&
              typeof (val as SpacedReviewRecord).problemId === 'string' &&
              typeof (val as SpacedReviewRecord).stage === 'number'
            ) {
              map.set(key, val as SpacedReviewRecord);
            }
          }
          return map;
        }
      } catch (parseErr) {
        console.error('Error parsing spaced reviews from localStorage', parseErr);
      }
      return new Map();
    }

    // Key is missing (null): perform initial sync with completions
    const completions = loadProblemCompletions();
    const synced = syncSpacedReviewsWithCompletions(completions, new Map());
    saveSpacedReviews(synced);
    return synced;
  } catch (e) {
    console.error('Error loading spaced reviews from localStorage', e);
    return new Map();
  }
}

export function saveSpacedReviews(reviews: Map<string, SpacedReviewRecord>): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const obj: Record<string, SpacedReviewRecord> = {};
      for (const [key, val] of reviews.entries()) {
        obj[key] = val;
      }
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(obj));
      return true;
    }
  } catch (e) {
    console.error('Error saving spaced reviews to localStorage', e);
    return false;
  }
  return false;
}

export function clearSpacedReviews(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(REVIEWS_KEY);
    }
  } catch (e) {
    console.error('Error clearing spaced reviews', e);
  }
}

export function scheduleSpacedReview(problemId: string, completedAt: string): SpacedReviewRecord {
  const reviews = loadSpacedReviews();
  const isValidTimestamp = completedAt && !isNaN(new Date(completedAt).getTime());
  const intervalDays = getIntervalForStage(0);
  const nextReviewDate = isValidTimestamp ? calculateNextReviewDate(completedAt, intervalDays) : null;

  const record: SpacedReviewRecord = {
    problemId,
    completionDate: completedAt || '',
    stage: 0,
    intervalDays,
    nextReviewDate,
    reviewCount: 0,
    reviewDateUnavailable: !isValidTimestamp
  };

  reviews.set(problemId, record);
  saveSpacedReviews(reviews);
  return record;
}

export function removeSpacedReview(problemId: string): void {
  const reviews = loadSpacedReviews();
  if (reviews.has(problemId)) {
    reviews.delete(problemId);
    saveSpacedReviews(reviews);
  }
}

export function recordReviewCompletion(problemId: string, reviewedAt: string = new Date().toISOString()): SpacedReviewRecord | null {
  const reviews = loadSpacedReviews();
  const existing = reviews.get(problemId);
  if (!existing) {
    return null;
  }

  // Idempotency: if already reviewed within the past 1000ms at this stage, don't double advance
  if (existing.lastReviewedDate) {
    const lastTime = new Date(existing.lastReviewedDate).getTime();
    const currTime = new Date(reviewedAt).getTime();
    if (Math.abs(currTime - lastTime) < 1000) {
      return existing;
    }
  }

  const nextStage = existing.stage + 1;
  const newIntervalDays = getIntervalForStage(nextStage);
  const nextReviewDate = calculateNextReviewDate(reviewedAt, newIntervalDays);

  const updated: SpacedReviewRecord = {
    ...existing,
    stage: nextStage,
    intervalDays: newIntervalDays,
    nextReviewDate,
    lastReviewedDate: reviewedAt,
    reviewCount: existing.reviewCount + 1,
    reviewDateUnavailable: false
  };

  reviews.set(problemId, updated);
  saveSpacedReviews(reviews);
  return updated;
}

export function recordLearningEvent(
  eventInput: Omit<LearningEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): LearningEvent | null {
  try {
    const events = loadLearningEvents();
    const eventId = eventInput.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = eventInput.timestamp || new Date().toISOString();

    // Check for exact duplicate event ID (idempotency)
    const existing = events.find(e => e.id === eventId);
    if (existing) {
      return existing;
    }

    // Special idempotency and sync for problem_completed:
    if (eventInput.type === 'problem_completed') {
      const completions = loadProblemCompletions();
      if (completions.has(eventInput.targetId)) {
        const lastCompletion = events.find(
          e => e.type === 'problem_completed' && e.targetId === eventInput.targetId
        );
        return lastCompletion || null;
      }
      completions.set(eventInput.targetId, {
        problemId: eventInput.targetId,
        completedAt: timestamp,
        highestHintLevel: (eventInput.metadata?.highestHintLevel as HintLevel | null | undefined),
        selfReported: (eventInput.metadata?.selfReported as boolean) ?? true,
        verification: (eventInput.metadata?.verification as CompletionVerification) ?? 'self_reported'
      });
      saveProblemCompletions(completions);
      scheduleSpacedReview(eventInput.targetId, timestamp);
    }

    // Special idempotency and sync for problem_uncompleted:
    if (eventInput.type === 'problem_uncompleted') {
      const completions = loadProblemCompletions();
      if (!completions.has(eventInput.targetId)) {
        return null;
      }
      completions.delete(eventInput.targetId);
      saveProblemCompletions(completions);
      removeSpacedReview(eventInput.targetId);
    }

    const newEvent: LearningEvent = {
      id: eventId,
      type: eventInput.type,
      targetId: eventInput.targetId,
      targetType: eventInput.targetType,
      timestamp,
      metadata: eventInput.metadata || {}
    };

    events.unshift(newEvent);
    const saved = saveLearningEvents(events);
    if (!saved) {
      return null;
    }
    return newEvent;
  } catch (e) {
    console.error('Error recording learning event', e);
    return null;
  }
}

