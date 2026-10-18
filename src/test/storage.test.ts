import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_STATS,
  SAMPLE_STATS,
  DEFAULT_SETTINGS,
  loadUserStats,
  saveUserStats,
  resetUserStats,
  loadAISettings,
  saveAISettings,
  loadCustomProblems,
  saveCustomProblem,
  getAllProblems,
  loadSavedSessions,
  saveMentorSession
} from '../services/storage';
import { Problem, MentorSession, UserStats } from '../types';

describe('Storage Service - Workstream B: Stats Defaults, Reset, and Defensive Loading', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('User Statistics Defaults and Reset', () => {
    it('initializes a new user with truthful empty statistics (no fictitious progress)', () => {
      const stats = loadUserStats();
      expect(stats.problemsPracticed).toBe(0);
      expect(stats.conceptsReviewed).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.weakAreas).toEqual([]);
      expect(stats.recentlyStudied).toEqual([]);
      expect(stats.recommendedNext).toEqual([]);
      expect(DEFAULT_STATS).toEqual({
        problemsPracticed: 0,
        conceptsReviewed: 0,
        currentStreak: 0,
        weakAreas: [],
        recentlyStudied: [],
        recommendedNext: []
      });
    });

    it('preserves SAMPLE_STATS separately for reference without imposing them on new users', () => {
      expect(SAMPLE_STATS.problemsPracticed).toBe(18);
      expect(SAMPLE_STATS.weakAreas.length).toBeGreaterThan(0);
      expect(loadUserStats().problemsPracticed).toBe(0);
    });

    it('resetUserStats restores valid empty state and clears recorded progress', () => {
      // Simulate user activity
      const activeStats: UserStats = {
        problemsPracticed: 12,
        conceptsReviewed: 5,
        currentStreak: 3,
        weakAreas: [{ topic: 'Graphs', reason: 'BFS cycle detection', urgency: 'High' }],
        recentlyStudied: [{ id: 'two-sum', type: 'problem', name: 'Two Sum', date: 'Today', difficulty: 'Easy' }],
        recommendedNext: [{ id: '3sum', type: 'problem', name: '3Sum', tag: 'Two Pointers', reason: 'Next step', mode: 'problem' }]
      };
      saveUserStats(activeStats);
      expect(loadUserStats().problemsPracticed).toBe(12);

      // Perform reset
      const resetResult = resetUserStats();
      expect(resetResult.problemsPracticed).toBe(0);
      expect(resetResult.weakAreas).toEqual([]);

      // Verify reloaded stats from storage are empty
      const reloaded = loadUserStats();
      expect(reloaded.problemsPracticed).toBe(0);
      expect(reloaded.conceptsReviewed).toBe(0);
      expect(reloaded.weakAreas).toEqual([]);
      expect(reloaded.recentlyStudied).toEqual([]);
      expect(reloaded.recommendedNext).toEqual([]);
    });

    it('resetting statistics preserves unrelated settings, custom problems, and sessions', () => {
      // Save settings
      saveAISettings({
        provider: 'mock',
        mentorStrictness: 'exploratory'
      });

      // Save custom problem
      const customProblem: Problem = {
        id: 'user-p1',
        title: 'Custom Problem',
        difficulty: 'Hard',
        tags: ['Math'],
        description: 'Test',
        examples: [],
        constraints: [],
        bruteForce: { approach: 'N', time: 'O(N)', space: 'O(1)' },
        optimalPattern: 'Math',
        optimalComplexity: { time: 'O(1)', space: 'O(1)' },
        hints: { nudge: 'n', hint: 'h', strongHint: 's', explain: 'e', solution: { language: 'py', code: 'pass', explanation: 'ok' } },
        socraticQuestions: [],
        category: 'Math'
      };
      saveCustomProblem(customProblem);

      // Save mentor session
      const session: MentorSession = {
        id: 'sess-1',
        title: 'Session 1',
        mode: 'problem',
        problemId: 'two-sum',
        currentStage: 'pattern',
        highestHintLevel: 'nudge',
        messages: [],
        updatedAt: new Date().toISOString()
      };
      saveMentorSession(session);

      // Reset statistics
      resetUserStats();

      // Verify settings, custom problems, and sessions remain intact
      expect(loadAISettings().provider).toBe('mock');
      expect(loadAISettings().mentorStrictness).toBe('exploratory');
      expect(loadCustomProblems()).toHaveLength(1);
      expect(loadCustomProblems()[0].id).toBe('user-p1');
      expect(loadSavedSessions()).toHaveLength(1);
      expect(loadSavedSessions()[0].id).toBe('sess-1');
    });

    it('loads existing valid user data without corrupting it', () => {
      const validStats: UserStats = {
        problemsPracticed: 7,
        conceptsReviewed: 4,
        currentStreak: 2,
        weakAreas: [{ topic: 'Binary Search', reason: 'Off-by-one', urgency: 'Medium' }],
        recentlyStudied: [{ id: 'binary-search', type: 'concept', name: 'Binary Search', date: 'Yesterday', difficulty: 'Easy' }],
        recommendedNext: [{ id: 'search-in-rotated', type: 'problem', name: 'Search in Rotated', tag: 'Binary Search', reason: 'Apply invariant', mode: 'problem' }]
      };
      saveUserStats(validStats);

      const loaded = loadUserStats();
      expect(loaded).toEqual(validStats);
    });

    it('defensively sanitizes malformed, unexpected, or partial stored stats', () => {
      // Missing arrays, negative numbers, bad types
      localStorage.setItem('algobuddy_user_stats', JSON.stringify({
        problemsPracticed: 'not a number',
        conceptsReviewed: -5,
        currentStreak: null,
        weakAreas: 'not an array',
        recentlyStudied: null
      }));

      const loaded = loadUserStats();
      expect(loaded.problemsPracticed).toBe(0);
      expect(loaded.conceptsReviewed).toBe(0);
      expect(loaded.currentStreak).toBe(0);
      expect(loaded.weakAreas).toEqual([]);
      expect(loaded.recentlyStudied).toEqual([]);
      expect(loaded.recommendedNext).toEqual([]);
    });

    it('handles localStorage throwing errors gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error('SecurityError: The operation is insecure.');
      };

      expect(() => loadUserStats()).not.toThrow();
      expect(loadUserStats()).toEqual(DEFAULT_STATS);

      expect(() => loadAISettings()).not.toThrow();
      expect(loadAISettings()).toEqual(DEFAULT_SETTINGS);

      expect(() => loadCustomProblems()).not.toThrow();
      expect(loadCustomProblems()).toEqual([]);

      expect(() => loadSavedSessions()).not.toThrow();
      expect(loadSavedSessions()).toEqual([]);

      localStorage.getItem = originalGetItem;
    });
  });

  describe('AI Settings Defensive Loading', () => {
    it('loads default settings when empty', () => {
      const settings = loadAISettings();
      expect(settings.provider).toBe(DEFAULT_SETTINGS.provider);
      expect(settings.gemmaProvider).toBe(DEFAULT_SETTINGS.gemmaProvider);
      expect(settings.mentorStrictness).toBe(DEFAULT_SETTINGS.mentorStrictness);
    });

    it('migrates legacy or missing gemma settings gracefully', () => {
      localStorage.setItem('algobuddy_settings', JSON.stringify({
        provider: 'gemma',
        gemmaProvider: 'groq',
        gemmaModel: 'gemma2-9b-it'
      }));
      const loaded = loadAISettings();
      expect(loaded.gemmaProvider).toBe('huggingface');
      expect(loaded.gemmaModel).toBe('google/gemma-3-12b-it');
      expect(loaded.gemmaEndpoint).toBe('https://router.huggingface.co/v1');
    });

    it('handles malformed JSON defensively', () => {
      localStorage.setItem('algobuddy_settings', 'MALFORMED');
      expect(() => loadAISettings()).not.toThrow();
      expect(loadAISettings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('Custom Problems Storage', () => {
    it('returns empty array when no custom problems saved', () => {
      expect(loadCustomProblems()).toEqual([]);
    });

    it('saves and retrieves custom problems without duplicates', () => {
      const sampleProblem: Problem = {
        id: 'custom-1',
        title: 'Custom Problem 1',
        difficulty: 'Medium',
        tags: ['Array'],
        description: 'Test problem',
        examples: [],
        constraints: ['N <= 100'],
        bruteForce: { approach: 'Naive', time: 'O(N^2)', space: 'O(1)' },
        optimalPattern: 'Two Pointers',
        optimalComplexity: { time: 'O(N)', space: 'O(1)' },
        hints: {
          nudge: 'nudge',
          hint: 'hint',
          strongHint: 'strongHint',
          explain: 'explain',
          solution: { language: 'python', code: 'pass', explanation: 'done' }
        },
        socraticQuestions: [],
        category: 'Arrays'
      };

      saveCustomProblem(sampleProblem);
      expect(loadCustomProblems()).toHaveLength(1);
      expect(loadCustomProblems()[0].title).toBe('Custom Problem 1');

      // Update same problem
      saveCustomProblem({ ...sampleProblem, title: 'Updated Title' });
      expect(loadCustomProblems()).toHaveLength(1);
      expect(loadCustomProblems()[0].title).toBe('Updated Title');
    });

    it('handles non-array or malformed JSON defensively', () => {
      localStorage.setItem('algobuddy_custom_problems', '{"not": "an array"}');
      expect(() => loadCustomProblems()).not.toThrow();
      expect(loadCustomProblems()).toEqual([]);
    });
  });

  describe('Mentor Sessions Storage', () => {
    it('returns empty array when no sessions saved', () => {
      expect(loadSavedSessions()).toEqual([]);
    });

    it('saves and limits sessions to recent 20', () => {
      const createSession = (id: string): MentorSession => ({
        id,
        title: `Session ${id}`,
        mode: 'problem',
        problemId: 'two-sum',
        currentStage: 'constraints',
        highestHintLevel: null,
        messages: [],
        updatedAt: new Date().toISOString()
      });

      for (let i = 1; i <= 25; i++) {
        saveMentorSession(createSession(`session-${i}`));
      }

      const saved = loadSavedSessions();
      expect(saved.length).toBe(20);
      expect(saved[0].id).toBe('session-25');
    });

    it('handles malformed JSON defensively', () => {
      localStorage.setItem('algobuddy_saved_sessions', 'INVALID');
      expect(() => loadSavedSessions()).not.toThrow();
      expect(loadSavedSessions()).toEqual([]);
    });
  });
});
