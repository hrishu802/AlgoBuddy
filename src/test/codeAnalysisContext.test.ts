import { describe, it, expect, vi } from 'vitest';
import { MockAIService, GemmaAIService } from '../services/ai/aiService';
import { buildCodeAnalysisPrompt } from '../services/ai/pedagogicalPrompt';
import { Problem } from '../types';

describe('Code Mode Problem Context Binding (Workstream E)', () => {
  const problemA: Problem = {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['Array'],
    description: 'Find two indices',
    examples: [],
    constraints: ['2 <= nums.length <= 10^4'],
    bruteForce: { approach: 'Quadratic loops', time: 'O(N^2)', space: 'O(1)' },
    optimalPattern: 'Hash Map',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    hints: { nudge: 'n', hint: 'h', strongHint: 's', explain: 'e', solution: { language: 'py', code: 'pass', explanation: 'done' } },
    socraticQuestions: [],
    category: 'Arrays'
  };

  const problemB: Problem = {
    id: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    tags: ['Two Pointers', 'Stack'],
    description: 'Compute trapped water',
    examples: [],
    constraints: ['n == height.length', '1 <= n <= 2 * 10^4'],
    bruteForce: { approach: 'Exhaustive scan per index', time: 'O(N^2)', space: 'O(1)' },
    optimalPattern: 'Two Pointers Monotonic Squeeze',
    optimalComplexity: { time: 'O(N)', space: 'O(1)' },
    hints: { nudge: 'n', hint: 'h', strongHint: 's', explain: 'e', solution: { language: 'py', code: 'pass', explanation: 'done' } },
    socraticQuestions: [],
    category: 'Two Pointers'
  };

  it('buildCodeAnalysisPrompt embeds problem context when provided', () => {
    const code = 'def solution(): pass';
    const context = `Problem: "${problemA.title}" (${problemA.difficulty})\nConstraints: ${problemA.constraints.join(' | ')}`;

    const promptWithContext = buildCodeAnalysisPrompt(code, 'python', context);
    expect(promptWithContext).toContain('PROBLEM CONTEXT: Problem: "Two Sum" (Easy)');
    expect(promptWithContext).toContain('2 <= nums.length <= 10^4');

    const promptWithoutContext = buildCodeAnalysisPrompt(code, 'python');
    expect(promptWithoutContext).not.toContain('PROBLEM CONTEXT:');
  });

  it('MockAIService incorporates problem context into analysis', async () => {
    const service = new MockAIService();
    const quadraticCode = 'for i in range(n):\n    for j in range(n):\n        pass';
    const contextA = `Problem: "${problemA.title}" (${problemA.difficulty})`;

    const analysisA = await service.analyzeCode(quadraticCode, 'python', contextA);
    expect(analysisA.correctnessNote).toContain('Two Sum');

    const contextB = `Problem: "${problemB.title}" (${problemB.difficulty})`;
    const analysisB = await service.analyzeCode(quadraticCode, 'python', contextB);
    expect(analysisB.correctnessNote).toContain('Trapping Rain Water');
    expect(analysisB.correctnessNote).not.toContain('Two Sum');
  });

  it('GemmaAIService forwards problem context into system prompt during backend inference call', async () => {
    let capturedPayload: any = null;
    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      capturedPayload = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          text: JSON.stringify({
            correctness: 'Looks Correct',
            timeComplexity: 'O(N)',
            spaceComplexity: 'O(1)',
            bottlenecks: ['None'],
            detectedPattern: 'Linear Scan',
            optimizationOpportunities: ['None']
          })
        })
      });
    });
    globalThis.fetch = mockFetch;

    const gemma = new GemmaAIService();
    const context = `Problem: "${problemA.title}" (${problemA.difficulty})\nConstraints: ${problemA.constraints.join(' | ')}`;

    await gemma.analyzeCode('def linear(): pass', 'python', context);

    expect(mockFetch).toHaveBeenCalled();
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.systemPrompt).toContain('PROBLEM CONTEXT: Problem: "Two Sum" (Easy)');
    expect(capturedPayload.systemPrompt).toContain('2 <= nums.length <= 10^4');
  });

  it('handles undefined or missing problem context gracefully without crashing', async () => {
    const service = new MockAIService();
    const analysis = await service.analyzeCode('def test(): pass', 'python');
    expect(analysis).toBeDefined();
    expect(analysis.correctness).toBe('Looks Correct');
    expect(analysis.timeComplexity).toBe('O(N)');
  });
});
