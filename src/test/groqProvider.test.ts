import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroqAIService, GemmaAIService, MockAIService, getAIService } from '../services/ai/aiService';
import {
  validateGemmaPayload,
  executeGemmaInference,
  checkHealth,
  sanitizeSecret,
  DEFAULT_GROQ_MODEL,
  DEFAULT_GROQ_ENDPOINT,
  GemmaProviderError
} from '../../api/gemma';
import { Problem, Concept, AISettings } from '../types';

describe('Groq Provider Integration & Safety Suite (₹0 Free Tier Budget)', () => {
  const originalEnv = { ...process.env };

  const testProblem: Problem = {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['Array', 'Hash Table'],
    description: 'Find two numbers that add up to target',
    examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
    constraints: ['2 <= nums.length <= 10^4'],
    bruteForce: { approach: 'Exhaustive search', time: 'O(N^2)', space: 'O(1)' },
    optimalPattern: 'Hash Map Lookup',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    hints: {
      nudge: 'Think about what number pairs with the current element.',
      hint: 'A hash map allows O(1) complement checks.',
      strongHint: 'Store each number as a key and its index as the value.',
      explain: 'Check if (target - num) is in the hash map before inserting.',
      solution: {
        language: 'python',
        code: 'def twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen: return [seen[target - n], i]\n        seen[n] = i\n    return []',
        explanation: 'Single-pass hash table approach.'
      }
    },
    socraticQuestions: ['What if duplicate elements exist?'],
    category: 'Arrays & Hashing'
  };

  const testConcept: Concept = {
    id: 'binary-search',
    name: 'Binary Search',
    category: 'Search',
    difficulty: 'Beginner',
    shortDescription: 'Divide and conquer search on sorted spaces',
    whatItIs: 'Halving search range on each step using monotonicity',
    whenToRecognize: ['Sorted array', 'Monotonic predicate'],
    commonPatterns: [{ name: 'Lower Bound', description: 'Find first true', problemExample: 'First Bad Version' }],
    simpleExample: { problem: 'Search', explanation: 'Halve space', codeSnippet: 'mid = (l + r) // 2', language: 'python' },
    commonMistakes: ['Integer overflow on (l + r)'],
    complexityTradeoffs: { time: 'O(log N)', space: 'O(1)', notes: 'Logarithmic search' },
    practiceQuestion: { question: 'Requires sorted space?', options: ['Yes', 'No'], answerIndex: 0, explanation: 'Yes' },
    status: 'In Progress'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // -----------------------------------------------------------------
  // 1. Groq Provider Server-Side Inference & Mocked Upstream Handling
  // -----------------------------------------------------------------
  describe('Server-side Groq Inference Execution (executeGemmaInference)', () => {
    it('executes Groq inference with OpenAI-compatible payload and returns standard response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'chatcmpl-mock-groq-123',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Welcome! Let us examine the constraints first: Think first. Hint second. Solution last.'
              }
            }
          ]
        })
      });
      globalThis.fetch = mockFetch;

      const result = await executeGemmaInference({
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        apiKey: 'gsk_test_key_mock_12345',
        prompt: 'Analyze constraints for Two Sum'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer gsk_test_key_mock_12345');

      const sentBody = JSON.parse(options.body);
      expect(sentBody.model).toBe('llama-3.3-70b-versatile');
      expect(sentBody.messages).toEqual([{ role: 'user', content: 'Analyze constraints for Two Sum' }]);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('groq');
      expect(result.text).toContain('Think first. Hint second. Solution last.');
    });

    it('throws HTTP 401 when Groq API key is missing', async () => {
      delete process.env.GROQ_API_KEY;

      await expect(
        executeGemmaInference({
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          prompt: 'Hello'
        })
      ).rejects.toThrow(/Groq API key is required/i);
    });

    it('handles upstream HTTP 401 invalid credentials error safely', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: 'Invalid API Key provided: gsk_secret_123' } })
      });
      globalThis.fetch = mockFetch;

      await expect(
        executeGemmaInference({
          provider: 'groq',
          apiKey: 'gsk_invalid_test_key',
          prompt: 'Test'
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        errorCategory: 'authentication'
      });
    });

    it('handles upstream HTTP 429 rate limit error gracefully without retries', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: { message: 'Rate limit reached for model llama-3.3-70b-versatile' } })
      });
      globalThis.fetch = mockFetch;

      await expect(
        executeGemmaInference({
          provider: 'groq',
          apiKey: 'gsk_valid_key',
          prompt: 'Test'
        })
      ).rejects.toMatchObject({
        statusCode: 429,
        errorCategory: 'rate_limit'
      });

      // Crucial: ensure no automated retry was dispatched to avoid burning free quota
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles upstream network timeout (504) and failure (503)', async () => {
      const abortError = new Error('The operation was aborted due to timeout');
      abortError.name = 'TimeoutError';
      const mockFetch = vi.fn().mockRejectedValue(abortError);
      globalThis.fetch = mockFetch;

      await expect(
        executeGemmaInference({
          provider: 'groq',
          apiKey: 'gsk_valid_key',
          prompt: 'Test'
        })
      ).rejects.toMatchObject({
        statusCode: 504,
        errorCategory: 'network'
      });
    });

    it('handles malformed or empty upstream responses safely', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] }) // missing message content
      });
      globalThis.fetch = mockFetch;

      await expect(
        executeGemmaInference({
          provider: 'groq',
          apiKey: 'gsk_valid_key',
          prompt: 'Test'
        })
      ).rejects.toMatchObject({
        statusCode: 502,
        errorCategory: 'provider_down'
      });
    });
  });

  // -----------------------------------------------------------------
  // 2. Health Check (₹0 Inference Guarantee)
  // -----------------------------------------------------------------
  describe('checkHealth for Groq (Zero Real Inference Request)', () => {
    it('returns configured without making a network call when apiKey is set', async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      const health = await checkHealth({
        provider: 'groq',
        apiKey: 'gsk_configured_key_123',
        model: 'llama-3.3-70b-versatile'
      });

      expect(health.status).toBe('configured');
      expect(health.statusCode).toBe(200);
      expect(health.message).toContain('Configured for Groq free-tier');
      // No inference call was dispatched!
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns unconfigured with 401 when apiKey is absent', async () => {
      delete process.env.GROQ_API_KEY;

      const health = await checkHealth({
        provider: 'groq'
      });

      expect(health.status).toBe('unconfigured');
      expect(health.statusCode).toBe(401);
      expect(health.errorCategory).toBe('authentication');
    });
  });

  // -----------------------------------------------------------------
  // 3. Payload Validation & TypeScript Discriminated-Union Narrowing
  // -----------------------------------------------------------------
  describe('validateGemmaPayload (TypeScript Union Narrowing & Boundary Safety)', () => {
    it('correctly discriminates valid: false with string error', () => {
      const res = validateGemmaPayload({ action: 'invalid_action' });
      expect(res.valid).toBe(false);
      if (res.valid === false) {
        // TypeScript compiler narrows res to ValidationError here
        expect(typeof res.error).toBe('string');
        expect(res.error).toContain('Invalid action');
      }
    });

    it('correctly discriminates valid: true with typed data', () => {
      const res = validateGemmaPayload({
        action: 'chat',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        prompt: 'Explain two sum'
      });
      expect(res.valid).toBe(true);
      if (res.valid === true) {
        // TypeScript compiler narrows res to ValidationSuccess here
        expect(res.data.provider).toBe('groq');
        expect(res.data.model).toBe('llama-3.3-70b-versatile');
      }
    });

    it('rejects unsupported provider strings', () => {
      const res = validateGemmaPayload({
        provider: 'unsupported_paid_vendor'
      });
      expect(res.valid).toBe(false);
      if (res.valid === false) {
        expect(res.error).toContain('Unsupported provider');
      }
    });
  });

  // -----------------------------------------------------------------
  // 4. Secret Sanitization & Leak Protection
  // -----------------------------------------------------------------
  describe('sanitizeSecret Redaction', () => {
    it('redacts Groq API keys matching gsk_ pattern', () => {
      const text = 'Error with key gsk_abc1234567890XYZ_test occurred';
      const sanitized = sanitizeSecret(text);
      expect(sanitized).not.toContain('gsk_abc1234567890XYZ_test');
      expect(sanitized).toContain('gsk_***');
    });

    it('redacts active process.env.GROQ_API_KEY value', () => {
      process.env.GROQ_API_KEY = 'gsk_super_secret_unique_key_999';
      const text = 'Failed authorization with gsk_super_secret_unique_key_999 on endpoint';
      const sanitized = sanitizeSecret(text);
      expect(sanitized).not.toContain('gsk_super_secret_unique_key_999');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('preserves redaction of Bearer tokens and Hugging Face tokens', () => {
      const text = 'Bearer secret_token and hf_token_sample';
      const sanitized = sanitizeSecret(text);
      expect(sanitized).toContain('Bearer [REDACTED]');
      expect(sanitized).toContain('hf_***');
    });
  });

  // -----------------------------------------------------------------
  // 5. GroqAIService - Three Learning Modes & Socratic Philosophy
  // -----------------------------------------------------------------
  describe('GroqAIService - Learning Modes & Socratic Philosophy', () => {
    it('starts Problem Mode session enforcing "Think first. Hint second. Solution last."', async () => {
      let capturedPayload: any = null;
      const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedPayload = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            success: true,
            text: 'Welcome to Two Sum! Let us look at constraints: "Think first. Hint second. Solution last."'
          })
        };
      });
      globalThis.fetch = mockFetch;

      const service = new GroqAIService();
      const msg = await service.startProblemSession(testProblem);

      expect(msg.sender).toBe('mentor');
      expect(msg.stage).toBe('constraints');
      expect(msg.content).toContain('Think first. Hint second. Solution last.');

      // Verify that Socratic system prompt was delivered to the backend
      expect(capturedPayload.provider).toBe('groq');
      expect(capturedPayload.systemPrompt).toContain('Think first. Hint second. Solution last.');
      expect(capturedPayload.systemPrompt).toContain('CONSTRAINTS');
    });

    it('answers Problem Mode question without revealing full solution', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          text: 'What is the time complexity of an exhaustive search?'
        })
      });
      globalThis.fetch = mockFetch;

      const service = new GroqAIService();
      const msg = await service.askProblemQuestion(testProblem, 'constraints', 'Is brute force O(N^2)?', []);

      expect(msg.content).toContain('What is the time complexity');
    });

    it('handles progressive hints Socratically', async () => {
      let capturedPayload: any = null;
      const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedPayload = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            success: true,
            text: 'Here is a subtle nudge: What complement pairs with target?'
          })
        };
      });
      globalThis.fetch = mockFetch;

      const service = new GroqAIService();
      const hintMsg = await service.requestHint(testProblem, 'nudge', 'pattern');

      expect(hintMsg.content).toContain('subtle nudge');
      expect(capturedPayload.messages[0].content).toContain('NUDGE');
    });

    it('advances pedagogy stages cleanly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          text: 'Now in pattern stage. What data structure gives O(1) lookups?'
        })
      });
      globalThis.fetch = mockFetch;

      const service = new GroqAIService();
      const stageMsg = await service.advancePedagogyStage(testProblem, 'pattern');
      expect(stageMsg.stage).toBe('pattern');
      expect(stageMsg.content).toContain('pattern stage');
    });

    it('explains concepts in Concept Mode', async () => {
      let capturedPayload: any = null;
      const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
        capturedPayload = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            success: true,
            text: 'Binary search works by repeatedly halving the search space...'
          })
        };
      });
      globalThis.fetch = mockFetch;

      const service = new GroqAIService();
      const conceptMsg = await service.explainConcept(testConcept);

      expect(conceptMsg.content).toContain('Binary search works');
      expect(capturedPayload.systemPrompt).toContain('Binary Search');
    });

    it('analyzes code in Code Mode and returns structured evaluation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          text: JSON.stringify({
            correctness: 'Looks Correct',
            correctnessNote: 'Efficient linear scan using hash map.',
            timeComplexity: 'O(N)',
            spaceComplexity: 'O(N)',
            detectedPattern: 'Hash Map Lookup',
            bottlenecks: [],
            optimizationOpportunities: [],
            edgeCasesHandled: ['Basic input', 'Target complement'],
            edgeCasesMissed: [],
            socraticQuestions: ['How would this change if inputs were sorted?']
          })
        })
      });
      globalThis.fetch = mockFetch;

      const service = new GroqAIService();
      const analysis = await service.analyzeCode('def twoSum(): pass', 'python');

      expect(analysis.correctness).toBe('Looks Correct');
      expect(analysis.timeComplexity).toBe('O(N)');
      expect(analysis.detectedPattern).toBe('Hash Map Lookup');
    });

    it('formats Groq 401 error with free-tier instructions', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          statusCode: 401,
          errorCategory: 'authentication',
          error: 'Groq authentication failed (HTTP 401): Invalid GROQ_API_KEY.'
        })
      });
      globalThis.fetch = mockFetch;

      const service = new GroqAIService();
      const msg = await service.startProblemSession(testProblem);

      expect(msg.content).toContain('Groq Authentication Required (HTTP 401)');
      expect(msg.content).toContain('console.groq.com/keys');
      expect(msg.suggestedActions).toContain('Switch to Socratic Mock');
    });

    it('formats Groq 429 rate limit error explaining 30 RPM without retrying', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          statusCode: 429,
          errorCategory: 'rate_limit',
          error: 'Groq free-tier rate limit reached (HTTP 429).'
        })
      });
      globalThis.fetch = mockFetch;

      const service = new GroqAIService();
      const msg = await service.startProblemSession(testProblem);

      expect(msg.content).toContain('Groq Free-Tier Rate Limit Reached (HTTP 429)');
      expect(msg.content).toContain('30 requests per minute');
      expect(msg.suggestedActions).toContain('Switch to Socratic Mock');
    });
  });

  // -----------------------------------------------------------------
  // 6. getAIService Factory & Provider Selection
  // -----------------------------------------------------------------
  describe('getAIService Factory Selection', () => {
    it('returns GroqAIService when provider is groq', () => {
      const service = getAIService({ provider: 'groq', mentorStrictness: 'strict' });
      expect(service).toBeInstanceOf(GroqAIService);
    });

    it('returns GroqAIService when gemmaProvider is groq', () => {
      const service = getAIService({ provider: 'gemma', gemmaProvider: 'groq', mentorStrictness: 'strict' });
      expect(service).toBeInstanceOf(GroqAIService);
    });

    it('returns GemmaAIService when provider is gemma (Hugging Face)', () => {
      const service = getAIService({ provider: 'gemma', gemmaProvider: 'huggingface', mentorStrictness: 'strict' });
      expect(service).toBeInstanceOf(GemmaAIService);
    });

    it('returns MockAIService when provider is mock', () => {
      const service = getAIService({ provider: 'mock', mentorStrictness: 'strict' });
      expect(service).toBeInstanceOf(MockAIService);
    });

    it('MockAIService functions completely without credentials or network access', async () => {
      const mockService = new MockAIService();
      const msg = await mockService.startProblemSession(testProblem);
      expect(msg.content).toContain('Think first. Hint second. Solution last.');
      expect(msg.stage).toBe('constraints');
    });
  });
});
