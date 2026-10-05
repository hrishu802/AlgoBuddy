import { UserStats, AISettings, Problem, MentorSession } from '../types';
import { PROBLEMS } from '../data/problems';

const STATS_KEY = 'algobuddy_user_stats';
const SETTINGS_KEY = 'algobuddy_settings';
const CUSTOM_PROBLEMS_KEY = 'algobuddy_custom_problems';
const SESSIONS_KEY = 'algobuddy_saved_sessions';

export const DEFAULT_STATS: UserStats = {
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
    const data = localStorage.getItem(STATS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading stats from localStorage', e);
  }
  return DEFAULT_STATS;
}

export function saveUserStats(stats: UserStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Error saving stats', e);
  }
}

export function loadAISettings(): AISettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Migrate deprecated groq or gemma2-9b-it settings to hosted Hugging Face
      if (parsed.gemmaProvider === 'groq' || parsed.gemmaModel === 'gemma2-9b-it' || !parsed.gemmaProvider) {
        parsed.gemmaProvider = 'huggingface';
        parsed.gemmaModel = 'google/gemma-3-12b-it';
        parsed.gemmaEndpoint = 'https://router.huggingface.co/v1';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Error loading settings', e);
  }
  return DEFAULT_SETTINGS;
}


export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function loadCustomProblems(): Problem[] {
  try {
    const data = localStorage.getItem(CUSTOM_PROBLEMS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading custom problems', e);
  }
  return [];
}

export function saveCustomProblem(problem: Problem): void {
  try {
    const current = loadCustomProblems();
    const filtered = current.filter(p => p.id !== problem.id);
    filtered.unshift(problem);
    localStorage.setItem(CUSTOM_PROBLEMS_KEY, JSON.stringify(filtered));
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
    const data = localStorage.getItem(SESSIONS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading sessions', e);
  }
  return [];
}

export function saveMentorSession(session: MentorSession): void {
  try {
    const current = loadSavedSessions();
    const filtered = current.filter(s => s.id !== session.id);
    filtered.unshift(session);
    // Keep max 20 recent sessions
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch (e) {
    console.error('Error saving session', e);
  }
}
