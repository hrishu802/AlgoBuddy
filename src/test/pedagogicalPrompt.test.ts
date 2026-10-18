import { describe, it, expect } from 'vitest';
import {
  ALGOBUDDY_SYSTEM_PROMPT,
  buildProblemStagePrompt,
  buildConceptExplanationPrompt,
  buildCodeAnalysisPrompt
} from '../services/ai/pedagogicalPrompt';
import { PedagogyStage } from '../types';

describe('Pedagogical Prompt Construction', () => {
  it('contains the non-negotiable core philosophy in the system prompt', () => {
    expect(ALGOBUDDY_SYSTEM_PROMPT).toContain('Think first. Hint second. Solution last.');
    expect(ALGOBUDDY_SYSTEM_PROMPT).toContain('PEDAGOGICAL DIRECTIVES:');
    expect(ALGOBUDDY_SYSTEM_PROMPT).toContain('PREVENT PREMATURE SOLUTION REVELATION');
    expect(ALGOBUDDY_SYSTEM_PROMPT).toContain('Level 1 (Nudge)');
    expect(ALGOBUDDY_SYSTEM_PROMPT).toContain('Level 5 (Solution)');
  });

  it('builds valid stage prompts for all pedagogy stages', () => {
    const stages: PedagogyStage[] = [
      'constraints',
      'bruteforce',
      'pattern',
      'hints',
      'optimize',
      'complexity',
      'solution'
    ];

    const bruteForce = {
      approach: 'Nested loops checking all pairs',
      time: 'O(N^2)',
      space: 'O(1)'
    };
    const optimalComplexity = {
      time: 'O(N)',
      space: 'O(N)'
    };
    const constraints = ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'];

    for (const stage of stages) {
      const prompt = buildProblemStagePrompt(
        'Two Sum',
        'Easy',
        stage,
        constraints,
        bruteForce,
        'Hash Map / Complement Lookup',
        optimalComplexity
      );

      expect(prompt).toContain('Two Sum');
      expect(prompt).toContain(`Current Pedagogy Stage: ${stage.toUpperCase()}`);
      expect(prompt).toContain('Nested loops checking all pairs');
      expect(prompt).toContain('Hash Map / Complement Lookup');
      expect(prompt).toContain('O(N^2)');
      expect(prompt).toContain('Think first. Hint second. Solution last.');
    }
  });

  it('builds valid concept explanation prompts with and without queries', () => {
    const triggers = ['Sorted array', 'Finding target pairs', 'Shrinking window'];
    const patterns = [
      {
        name: 'Opposite Direction Two Pointers',
        description: 'Left and right pointers closing in',
        problemExample: 'Two Sum II'
      }
    ];
    const mistakes = ['Advancing both pointers simultaneously', 'Forgetting sorted precondition'];

    // Without query
    const promptWithoutQuery = buildConceptExplanationPrompt(
      'Two Pointers',
      'A technique utilizing two index pointers',
      triggers,
      patterns,
      mistakes,
      'O(N)',
      'O(1)'
    );
    expect(promptWithoutQuery).toContain('Two Pointers');
    expect(promptWithoutQuery).toContain('A technique utilizing two index pointers');
    expect(promptWithoutQuery).toContain('Two Sum II');
    expect(promptWithoutQuery).toContain('O(N)');
    expect(promptWithoutQuery).toContain('O(1)');

    // With query
    const promptWithQuery = buildConceptExplanationPrompt(
      'Two Pointers',
      'A technique utilizing two index pointers',
      triggers,
      patterns,
      mistakes,
      'O(N)',
      'O(1)',
      'How does this avoid quadratic time?'
    );
    expect(promptWithQuery).toContain('How does this avoid quadratic time?');
  });

  it('builds valid code analysis prompts with and without problem context', () => {
    const code = 'def two_sum(nums, target):\n    pass';
    const language = 'python';

    const promptNoCtx = buildCodeAnalysisPrompt(code, language);
    expect(promptNoCtx).toContain('LANGUAGE: python');
    expect(promptNoCtx).toContain('def two_sum');
    expect(promptNoCtx).toContain('"correctness"');
    expect(promptNoCtx).toContain('"timeComplexity"');

    const promptWithCtx = buildCodeAnalysisPrompt(code, language, 'Target sum must be found with constraints N <= 10^4');
    expect(promptWithCtx).toContain('PROBLEM CONTEXT: Target sum must be found with constraints N <= 10^4');
  });
});
