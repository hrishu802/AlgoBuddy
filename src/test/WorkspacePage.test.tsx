import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WorkspacePage } from '../pages/WorkspacePage';
import { MockAIService } from '../services/ai/aiService';
import { saveMentorSession } from '../services/storage';
import { Problem, Concept, AISettings } from '../types';

describe('WorkspacePage Component Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockProblem1: Problem = {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['Array'],
    description: 'Find two indices',
    examples: [],
    constraints: ['N <= 10^4'],
    bruteForce: { approach: 'Quad', time: 'O(N^2)', space: 'O(1)' },
    optimalPattern: 'Hash Map',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    hints: { nudge: 'n', hint: 'h', strongHint: 's', explain: 'e', solution: { language: 'py', code: 'pass', explanation: 'done' } },
    socraticQuestions: [],
    category: 'Arrays'
  };

  const mockProblem2: Problem = {
    id: '3sum',
    title: '3Sum',
    difficulty: 'Medium',
    tags: ['Two Pointers'],
    description: 'Find triplets',
    examples: [],
    constraints: ['N <= 3000'],
    bruteForce: { approach: 'Cubic', time: 'O(N^3)', space: 'O(1)' },
    optimalPattern: 'Sort and Two Pointers',
    optimalComplexity: { time: 'O(N^2)', space: 'O(1)' },
    hints: { nudge: 'n', hint: 'h', strongHint: 's', explain: 'e', solution: { language: 'py', code: 'pass', explanation: 'done' } },
    socraticQuestions: [],
    category: 'Two Pointers'
  };

  const mockConcept: Concept = {
    id: 'two-pointers',
    name: 'Two Pointers',
    category: 'Array',
    difficulty: 'Beginner',
    shortDescription: 'Two pointers technique',
    whatItIs: 'Scan array with two pointers',
    whenToRecognize: ['Sorted array'],
    commonPatterns: [],
    simpleExample: { problem: 'p', explanation: 'e', codeSnippet: 'c', language: 'py' },
    commonMistakes: [],
    complexityTradeoffs: { time: 'O(N)', space: 'O(1)', notes: 'Linear' },
    practiceQuestion: { question: 'q', options: ['a', 'b'], answerIndex: 0, explanation: 'exp' },
    status: 'In Progress'
  };

  const mockSettings: AISettings = {
    provider: 'mock',
    mentorStrictness: 'strict'
  };

  it('restores saved mentor session without duplicating initial messages', async () => {
    // Pre-save a session in localStorage
    saveMentorSession({
      id: 'session-problem-two-sum',
      title: 'Two Sum',
      mode: 'problem',
      problemId: 'two-sum',
      currentStage: 'pattern',
      highestHintLevel: 'nudge',
      messages: [
        {
          id: 'saved-msg-1',
          sender: 'mentor',
          content: 'Previously saved mentor insight on Two Sum',
          timestamp: '10:00 AM'
        }
      ],
      updatedAt: new Date().toISOString()
    });

    const aiService = new MockAIService();
    const startSessionSpy = vi.spyOn(aiService, 'startProblemSession');

    render(
      <WorkspacePage
        initialMode="problem"
        currentProblem={mockProblem1}
        allProblems={[mockProblem1, mockProblem2]}
        onSelectProblem={() => {}}
        currentConcept={mockConcept}
        allConcepts={[mockConcept]}
        onSelectConcept={() => {}}
        aiService={aiService}
        settings={mockSettings}
        onOpenNewProblem={() => {}}
      />
    );

    // Should immediately display the saved message
    expect(screen.getByText('Previously saved mentor insight on Two Sum')).toBeDefined();

    // Must NOT call startProblemSession when saved session is present
    expect(startSessionSpy).not.toHaveBeenCalled();
  });

  it('generates a fresh initial session when no saved session exists', async () => {
    const aiService = new MockAIService();
    const startSessionSpy = vi.spyOn(aiService, 'startProblemSession');

    render(
      <WorkspacePage
        initialMode="problem"
        currentProblem={mockProblem2}
        allProblems={[mockProblem1, mockProblem2]}
        onSelectProblem={() => {}}
        currentConcept={mockConcept}
        allConcepts={[mockConcept]}
        onSelectConcept={() => {}}
        aiService={aiService}
        settings={mockSettings}
        onOpenNewProblem={() => {}}
      />
    );

    expect(startSessionSpy).toHaveBeenCalledWith(mockProblem2);

    await waitFor(() => {
      expect(screen.getByText(/3Sum/)).toBeDefined();
    });
  });
});
