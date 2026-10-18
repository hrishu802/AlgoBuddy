import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  sanitizeSecret,
  getEnvProvider,
  getEnvApiKey,
  getEnvEndpoint,
  getEnvModel,
  executeGemmaInference,
  handleGemmaRequest,
  GemmaProviderError
} from '../../api/gemma';
import { GemmaAIService } from '../services/ai/aiService';
import { WorkspacePage } from '../pages/WorkspacePage';
import { Problem, Concept, AISettings } from '../types';

describe('Gemma Inference & Error Handling Diagnostics (HTTP 402 & Resilience)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const sampleProblem: Problem = {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['Array', 'Hash Table'],
    description: 'Find two indices that sum to target',
    examples: [],
    constraints: ['2 <= nums.length <= 10^4'],
    bruteForce: { approach: 'Quadratic check', time: 'O(N^2)', space: 'O(1)' },
    optimalPattern: 'Hash Map Lookup',
    optimalComplexity: { time: 'O(N)', space: 'O(N)' },
    hints: {
      nudge: 'Think about complement',
      hint: 'Use hash map',
      strongHint: 'Store seen values',
      explain: 'Single pass',
      solution: { language: 'python', code: 'pass', explanation: 'done' }
    },
    socraticQuestions: [],
    category: 'Arrays'
  };

  const sampleConcept: Concept = {
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
    provider: 'gemma',
    gemmaProvider: 'huggingface',
    gemmaModel: 'google/gemma-3-12b-it',
    mentorStrictness: 'strict'
  };

  // ========================================================
  // 1. Environment Variable Resolution & Fallback Behavior
  // ========================================================
  describe('Environment Variable Resolution', () => {
    it('resolves default provider to huggingface when unset', () => {
      delete process.env.GEMMA_PROVIDER;
      expect(getEnvProvider()).toBe('huggingface');
    });

    it('resolves API key from HF_TOKEN, HUGGINGFACE_API_KEY, or GEMMA_API_KEY', () => {
      delete process.env.HF_TOKEN;
      delete process.env.HUGGINGFACE_API_KEY;
      delete process.env.GEMMA_API_KEY;

      process.env.GEMMA_API_KEY = 'test_gemma_key';
      expect(getEnvApiKey('huggingface')).toBe('test_gemma_key');

      process.env.HUGGINGFACE_API_KEY = 'test_hf_alias_key';
      expect(getEnvApiKey('huggingface')).toBe('test_hf_alias_key');

      process.env.HF_TOKEN = 'test_hf_primary_token';
      expect(getEnvApiKey('huggingface')).toBe('test_hf_primary_token');
    });

    it('resolves OpenRouter API key correctly', () => {
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.GEMMA_API_KEY;
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key';
      expect(getEnvApiKey('openrouter')).toBe('sk-or-v1-test-key');
    });

    it('resolves default endpoint and model for Hugging Face', () => {
      delete process.env.GEMMA_ENDPOINT;
      delete process.env.GEMMA_MODEL;
      expect(getEnvEndpoint('huggingface')).toBe('https://router.huggingface.co/v1');
      expect(getEnvModel('huggingface')).toBe('google/gemma-3-12b-it');
    });
  });

  // ========================================================
  // 2. Secret Redaction & Token Sanitization
  // ========================================================
  describe('Secret Redaction & Token Sanitization', () => {
    it('redacts Hugging Face token patterns', () => {
      const sanitized = sanitizeSecret('Error with token hf_AbCdEfGhIjKlMnOp123456 during inference');
      expect(sanitized).not.toContain('hf_AbCdEfGhIjKlMnOp123456');
      expect(sanitized).toContain('hf_***');
    });

    it('redacts Bearer authorization header values', () => {
      const sanitized = sanitizeSecret('Authorization: Bearer secret_token_xyz_987');
      expect(sanitized).not.toContain('secret_token_xyz_987');
      expect(sanitized).toContain('Bearer [REDACTED]');
    });

    it('redacts OpenAI/OpenRouter sk- style keys', () => {
      const sanitized = sanitizeSecret('Failed connecting with sk-or-v1-1234567890abcdef');
      expect(sanitized).not.toContain('1234567890abcdef');
      expect(sanitized).toContain('sk-***');
    });

    it('redacts query parameter tokens', () => {
      const sanitized = sanitizeSecret('Failed request to https://api.endpoint.com?apiKey=very_secret_token_123&test=1');
      expect(sanitized).not.toContain('very_secret_token_123');
      expect(sanitized).toContain('apiKey=[REDACTED]');
    });

    it('redacts active runtime environment secrets', () => {
      process.env.HF_TOKEN = 'hf_live_secret_active_123456789';
      const sanitized = sanitizeSecret('Upstream failed for token hf_live_secret_active_123456789 in request');
      expect(sanitized).not.toContain('hf_live_secret_active_123456789');
    });
  });

  // ========================================================
  // 3. Provider Error Handling & Status Preservation
  // ========================================================
  describe('Provider Error Handling & Status Preservation', () => {
    it('throws GemmaProviderError with 401 when API token is missing', async () => {
      delete process.env.HF_TOKEN;
      delete process.env.HUGGINGFACE_API_KEY;
      delete process.env.GEMMA_API_KEY;

      await expect(
        executeGemmaInference({
          prompt: 'Hello',
          provider: 'huggingface'
        })
      ).rejects.toThrowError(/Hugging Face API token is required/);
    });

    it('correctly categorizes HTTP 402 as billing error with clear credit exhaustion message', async () => {
      process.env.HF_TOKEN = 'hf_dummy_token_for_mock_test_123456';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        text: async () => JSON.stringify({
          error: 'You have no remaining credits. Purchase pre-paid credits to continue using Inference Providers. Alternatively, subscribe to PRO to get monthly included credits.'
        })
      });

      try {
        await executeGemmaInference({
          prompt: 'Solve two sum',
          provider: 'huggingface'
        });
        expect.fail('Should have thrown GemmaProviderError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GemmaProviderError);
        const provErr = err as GemmaProviderError;
        expect(provErr.statusCode).toBe(402);
        expect(provErr.errorCategory).toBe('billing');
        expect(provErr.message).toContain('HTTP 402');
        expect(provErr.message).toContain('You have no remaining credits');
      }
    });

    it('correctly categorizes HTTP 429 as rate limit without falsely labeling as billing', async () => {
      process.env.HF_TOKEN = 'hf_dummy_token_for_mock_test_123456';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: 'Too Many Requests' })
      });

      try {
        await executeGemmaInference({
          prompt: 'Solve two sum',
          provider: 'huggingface'
        });
        expect.fail('Should have thrown GemmaProviderError');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(GemmaProviderError);
        const provErr = err as GemmaProviderError;
        expect(provErr.statusCode).toBe(429);
        expect(provErr.errorCategory).toBe('rate_limit');
        expect(provErr.message).toContain('Rate limit exceeded');
      }
    });

    it('handleGemmaRequest preserves HTTP 402 status code and returns structured JSON', async () => {
      process.env.HF_TOKEN = 'hf_dummy_token_for_mock_test_123456';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        text: async () => JSON.stringify({
          error: 'You have no remaining credits. Purchase pre-paid credits to continue using Inference Providers.'
        })
      });

      let responseStatusCode = 0;
      let responseBody = '';
      const mockReq = {
        method: 'POST',
        body: { prompt: 'Hello Gemma' }
      } as any;

      const mockRes = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: (data: string) => {
          responseBody = data;
          responseStatusCode = mockRes.statusCode;
        }
      } as any;

      await handleGemmaRequest(mockReq, mockRes);
      expect(responseStatusCode).toBe(402);
      const parsed = JSON.parse(responseBody);
      expect(parsed.success).toBe(false);
      expect(parsed.statusCode).toBe(402);
      expect(parsed.errorCategory).toBe('billing');
      expect(parsed.error).toContain('HTTP 402');
    });
  });

  // ========================================================
  // 4. Frontend Workspace Display & Error Consolidation
  // ========================================================
  describe('Frontend Workspace Display & Error Consolidation', () => {
    it('displays single formatted error card for HTTP 402 with billing link and retry actions', async () => {
      const mockAIService = new GemmaAIService(mockSettings);
      vi.spyOn(mockAIService, 'startProblemSession').mockResolvedValue({
        id: 'err-test-402',
        sender: 'mentor',
        stage: 'constraints',
        timestamp: '12:00 PM',
        content: `⚠️ **Hugging Face Inference Credits Exhausted (HTTP 402)**\n\n` +
          `*Status: Account Billing / Credits Restriction • Code: 402*\n\n` +
          `The hosted inference provider rejected the request because your account has **no remaining inference credits**.\n\n` +
          `**How to resolve:**\n1. Visit [Hugging Face Billing Settings](https://huggingface.co/settings/billing).`,
        suggestedActions: ['Retry Request', 'Switch to Socratic Mock', 'Open Settings (⚙️)']
      });

      render(
        <WorkspacePage
          initialMode="problem"
          currentProblem={sampleProblem}
          allProblems={[sampleProblem]}
          onSelectProblem={() => {}}
          currentConcept={sampleConcept}
          allConcepts={[sampleConcept]}
          onSelectConcept={() => {}}
          aiService={mockAIService}
          settings={mockSettings}
          onOpenNewProblem={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Credits Exhausted \(HTTP 402\)/i)).toBeDefined();
      });

      // Verify billing link is rendered and safe
      const billingLink = screen.getByRole('link', { name: /Hugging Face Billing Settings/i });
      expect(billingLink).toBeDefined();
      expect(billingLink.getAttribute('href')).toBe('https://huggingface.co/settings/billing');

      // Verify suggested action chips
      expect(screen.getByText('Retry Request')).toBeDefined();
      expect(screen.getByText('Switch to Socratic Mock')).toBeDefined();
      expect(screen.getByText('Open Settings (⚙️)')).toBeDefined();

      // Ensure only ONE error card is present (no duplication)
      const errorHeaders = screen.getAllByText(/Credits Exhausted \(HTTP 402\)/i);
      expect(errorHeaders.length).toBe(1);
    });

    it('preserves user input text in textarea when inference request fails', async () => {
      const mockAIService = new GemmaAIService(mockSettings);
      vi.spyOn(mockAIService, 'startProblemSession').mockResolvedValue({
        id: 'msg-init',
        sender: 'mentor',
        stage: 'constraints',
        timestamp: '12:00 PM',
        content: 'Welcome to Two Sum!'
      });

      // Simulate askProblemQuestion failure returning error message
      vi.spyOn(mockAIService, 'askProblemQuestion').mockResolvedValue({
        id: 'err-fail-1',
        sender: 'mentor',
        stage: 'constraints',
        timestamp: '12:01 PM',
        content: '⚠️ **Hugging Face Inference Credits Exhausted (HTTP 402)**',
        suggestedActions: ['Retry Request', 'Switch to Socratic Mock']
      });

      render(
        <WorkspacePage
          initialMode="problem"
          currentProblem={sampleProblem}
          allProblems={[sampleProblem]}
          onSelectProblem={() => {}}
          currentConcept={sampleConcept}
          allConcepts={[sampleConcept]}
          onSelectConcept={() => {}}
          aiService={mockAIService}
          settings={mockSettings}
          onOpenNewProblem={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Two Sum!')).toBeDefined();
      });

      const textarea = screen.getByPlaceholderText(/Ask mentor a question/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Can I use a hash map here?' } });
      expect(textarea.value).toBe('Can I use a hash map here?');

      const sendButton = screen.getByTitle(/Send message/i);
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Credits Exhausted \(HTTP 402\)/i)).toBeDefined();
      });

      // Verify that the user's input text remained intact in the input box for editing
      expect(textarea.value).toBe('Can I use a hash map here?');
    });

    it('clicking Retry Request does not append redundant duplicate error cards', async () => {
      const mockAIService = new GemmaAIService(mockSettings);
      let callCount = 0;
      vi.spyOn(mockAIService, 'startProblemSession').mockImplementation(async () => {
        callCount++;
        return {
          id: `err-init-${callCount}`,
          sender: 'mentor',
          stage: 'constraints',
          timestamp: '12:00 PM',
          content: '⚠️ **Hugging Face Inference Credits Exhausted (HTTP 402)**',
          suggestedActions: ['Retry Request', 'Switch to Socratic Mock']
        };
      });

      render(
        <WorkspacePage
          initialMode="problem"
          currentProblem={sampleProblem}
          allProblems={[sampleProblem]}
          onSelectProblem={() => {}}
          currentConcept={sampleConcept}
          allConcepts={[sampleConcept]}
          onSelectConcept={() => {}}
          aiService={mockAIService}
          settings={mockSettings}
          onOpenNewProblem={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Credits Exhausted \(HTTP 402\)/i)).toBeDefined();
      });

      const retryButton = screen.getByText('Retry Request');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(callCount).toBeGreaterThanOrEqual(2);
      });

      // Verify that identical error cards did NOT accumulate
      const errorCards = screen.getAllByText(/Credits Exhausted \(HTTP 402\)/i);
      expect(errorCards.length).toBe(1);
    });

    it('clicking Switch to Socratic Mock invokes mock service and updates mentor response', async () => {
      const mockAIService = new GemmaAIService(mockSettings);
      vi.spyOn(mockAIService, 'startProblemSession').mockResolvedValue({
        id: 'err-init',
        sender: 'mentor',
        stage: 'constraints',
        timestamp: '12:00 PM',
        content: '⚠️ **Hugging Face Inference Credits Exhausted (HTTP 402)**',
        suggestedActions: ['Retry Request', 'Switch to Socratic Mock']
      });

      const onUpdateSettingsSpy = vi.fn();

      render(
        <WorkspacePage
          initialMode="problem"
          currentProblem={sampleProblem}
          allProblems={[sampleProblem]}
          onSelectProblem={() => {}}
          currentConcept={sampleConcept}
          allConcepts={[sampleConcept]}
          onSelectConcept={() => {}}
          aiService={mockAIService}
          settings={mockSettings}
          onOpenNewProblem={() => {}}
          onUpdateSettings={onUpdateSettingsSpy}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Switch to Socratic Mock')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Switch to Socratic Mock'));

      await waitFor(() => {
        expect(onUpdateSettingsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ provider: 'mock' })
        );
        expect(screen.getByText(/Socratic Mock Mentor • Local Dev Fallback/i)).toBeDefined();
      });
    });

    it('does not persist error messages into localStorage saved sessions', async () => {
      const mockAIService = new GemmaAIService(mockSettings);
      vi.spyOn(mockAIService, 'startProblemSession').mockResolvedValue({
        id: 'err-402-nopersist',
        sender: 'mentor',
        stage: 'constraints',
        timestamp: '12:00 PM',
        content: '⚠️ **Hugging Face Inference Credits Exhausted (HTTP 402)**',
        suggestedActions: ['Retry Request', 'Switch to Socratic Mock']
      });

      render(
        <WorkspacePage
          initialMode="problem"
          currentProblem={sampleProblem}
          allProblems={[sampleProblem]}
          onSelectProblem={() => {}}
          currentConcept={sampleConcept}
          allConcepts={[sampleConcept]}
          onSelectConcept={() => {}}
          aiService={mockAIService}
          settings={mockSettings}
          onOpenNewProblem={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Credits Exhausted \(HTTP 402\)/i)).toBeDefined();
      });

      const savedSessionsRaw = localStorage.getItem('algobuddy_saved_sessions');
      if (savedSessionsRaw) {
        const savedSessions = JSON.parse(savedSessionsRaw);
        for (const session of savedSessions) {
          for (const msg of session.messages) {
            expect(msg.id).not.toContain('err-');
            expect(msg.content).not.toContain('Credits Exhausted');
          }
        }
      }
    });
  });
});
