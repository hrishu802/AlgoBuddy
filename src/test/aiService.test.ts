import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockAIService, GemmaAIService } from '../services/ai/aiService';
import { Problem, Concept } from '../types';

describe('AI Service Implementations', () => {
  const sampleProblem: Problem = {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['Array', 'Hash Table'],
    description: 'Find two numbers that add up to target',
    examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
    constraints: ['2 <= nums.length <= 10^4'],
    bruteForce: { approach: 'Exhaustive check', time: 'O(N^2)', space: 'O(1)' },
    optimalPattern: 'Hash Map Lookup',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    hints: {
      nudge: 'Notice what complement you need for each number.',
      hint: 'A hash map provides O(1) lookups.',
      strongHint: 'Store number -> index in map while iterating.',
      explain: 'Check if target - num exists in map before inserting.',
      solution: {
        language: 'python',
        code: 'def twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n    return []',
        explanation: 'Single pass hash table approach.'
      }
    },
    socraticQuestions: ['What happens if the array contains negative numbers?'],
    category: 'Arrays & Hashing'
  };

  const sampleConcept: Concept = {
    id: 'two-pointers',
    name: 'Two Pointers',
    category: 'Array',
    difficulty: 'Beginner',
    shortDescription: 'Iterate with two pointers from opposing ends or fast/slow speeds',
    whatItIs: 'An optimization technique that scans linear data structures efficiently',
    whenToRecognize: ['Sorted array', 'Finding pairs', 'In-place array manipulation'],
    commonPatterns: [
      {
        name: 'Converging Pointers',
        description: 'Left and right pointers moving inward',
        problemExample: 'Two Sum II'
      }
    ],
    simpleExample: {
      problem: 'Reverse String',
      explanation: 'Swap characters at left and right pointers',
      codeSnippet: 'left, right = 0, len(s) - 1',
      language: 'python'
    },
    commonMistakes: ['Forgetting that the array must be sorted'],
    complexityTradeoffs: {
      time: 'O(N)',
      space: 'O(1)',
      notes: 'Reduces quadratic comparisons to linear pass'
    },
    practiceQuestion: {
      question: 'When can two pointers be applied?',
      options: ['Sorted arrays', 'Unsorted graphs'],
      answerIndex: 0,
      explanation: 'Monotonicity is typically required'
    },
    status: 'In Progress'
  };

  describe('MockAIService (Offline / Dev Fallback)', () => {
    const mockService = new MockAIService();

    it('starts a problem session with Socratic constraints focus', async () => {
      const msg = await mockService.startProblemSession(sampleProblem);
      expect(msg.sender).toBe('mentor');
      expect(msg.stage).toBe('constraints');
      expect(msg.content).toContain('Two Sum');
      expect(msg.content).toContain('Think first. Hint second. Solution last.');
    });

    it('responds Socratically to user messages by stage', async () => {
      const msg = await mockService.askProblemQuestion(
        sampleProblem,
        'constraints',
        'Could we use brute force?',
        []
      );
      expect(msg.sender).toBe('mentor');
      expect(msg.content).toContain('Brute Force Breakdown');
      expect(msg.content).toContain('Exhaustive check');
    });

    it('provides progressive hints without exposing solutions prematurely', async () => {
      const nudge = await mockService.requestHint(sampleProblem, 'nudge', 'constraints');
      expect(nudge.hintLevel).toBe('nudge');
      expect(nudge.content).toContain('Nudge (Level 1 / 5)');
      expect(nudge.codeSnippet).toBeUndefined();

      const solution = await mockService.requestHint(sampleProblem, 'solution', 'hints');
      expect(solution.hintLevel).toBe('solution');
      expect(solution.codeSnippet).toBeDefined();
      expect(solution.codeSnippet?.code).toContain('def twoSum');
    });

    it('explains concepts with recognition triggers', async () => {
      const conceptMsg = await mockService.explainConcept(sampleConcept);
      expect(conceptMsg.content).toContain('Two Pointers');
      expect(conceptMsg.content).toContain('When to Recognize');
      expect(conceptMsg.content).toContain('Sorted array');
    });

    it('analyzes code and detects patterns', async () => {
      const code = 'for i in range(len(nums)):\n    for j in range(i+1, len(nums)):\n        if nums[i] + nums[j] == target: return [i, j]';
      const analysis = await mockService.analyzeCode(code, 'python');
      expect(analysis.timeComplexity).toBe('O(N^2)');
      expect(analysis.detectedPattern).toContain('Brute Force');
      expect(analysis.bottlenecks.length).toBeGreaterThan(0);
    });
  });

  describe('GemmaAIService (Network Mocking)', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('handles backend response cleanly when successful', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          text: 'Welcome to Two Sum! Let us examine the constraints first.'
        })
      });
      globalThis.fetch = mockFetch;

      const service = new GemmaAIService();
      const msg = await service.startProblemSession(sampleProblem);
      expect(msg.content).toContain('Welcome to Two Sum!');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('formats configuration error gracefully when inference endpoint fails', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network connection refused'));
      globalThis.fetch = mockFetch;

      const service = new GemmaAIService();
      const msg = await service.startProblemSession(sampleProblem);
      expect(msg.content).toContain('Google Gemma Hosted Inference Error');
      expect(msg.content).toContain('Network connection refused');
      expect(msg.suggestedActions).toContain('Open Settings (⚙️)');
    });

    it('formats HTTP 402 credit exhaustion error with billing link and resolution steps', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        json: async () => ({
          success: false,
          statusCode: 402,
          errorCategory: 'billing',
          error: 'Hugging Face router returned HTTP 402: You have no remaining credits.'
        })
      });
      globalThis.fetch = mockFetch;

      const service = new GemmaAIService();
      const msg = await service.startProblemSession(sampleProblem);
      expect(msg.content).toContain('Credits Exhausted (HTTP 402)');
      expect(msg.content).toContain('https://huggingface.co/settings/billing');
      expect(msg.suggestedActions).toContain('Retry Request');
      expect(msg.suggestedActions).toContain('Switch to Socratic Mock');
    });

    it('formats HTTP 401 authentication error with token guidance', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          statusCode: 401,
          errorCategory: 'authentication',
          error: 'Hugging Face authentication failed (401 Unauthorized).'
        })
      });
      globalThis.fetch = mockFetch;

      const service = new GemmaAIService();
      const msg = await service.startProblemSession(sampleProblem);
      expect(msg.content).toContain('Authentication Failed (HTTP 401)');
      expect(msg.suggestedActions).toContain('Open Settings (⚙️)');
    });
  });
});
