import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  handleGemmaRequest,
  executeGemmaInference,
  checkHealth,
  getGatewayDiagnostics,
  validateGemmaPayload,
  checkRateLimit,
  resetRateLimits,
  getClientIp,
  resolveCorsOrigin,
  sanitizeSecret,
  GemmaProviderError,
  MAX_BODY_BYTES
} from '../../api/gemma';

describe('Production Deployment & Backend Proxy Hardening', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetRateLimits();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetRateLimits();
  });

  // Helper to construct a mock Node.js IncomingMessage
  function createMockRequest(options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
    chunks?: string[];
  }): IncomingMessage {
    const { method = 'POST', url = '/api/gemma', headers = {}, body, chunks } = options;

    if (chunks) {
      const asyncIterator = async function* () {
        for (const chunk of chunks) {
          yield Buffer.from(chunk, 'utf8');
        }
      };
      return Object.assign(asyncIterator(), {
        method,
        url,
        headers,
        socket: { remoteAddress: '127.0.0.1' }
      }) as unknown as IncomingMessage;
    }

    return {
      method,
      url,
      headers,
      body,
      socket: { remoteAddress: '127.0.0.1' }
    } as unknown as IncomingMessage;
  }

  // Helper to construct a mock Node.js ServerResponse
  function createMockResponse(): {
    res: ServerResponse;
    getStatusCode: () => number;
    getBody: () => string;
    getJson: () => any;
    getHeaders: () => Record<string, string>;
  } {
    let statusCode = 200;
    let body = '';
    const headers: Record<string, string> = {};

    const res = {
      get statusCode() {
        return statusCode;
      },
      set statusCode(code: number) {
        statusCode = code;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = String(value);
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
      end(data?: string) {
        if (data) body = data;
      }
    } as unknown as ServerResponse;

    return {
      res,
      getStatusCode: () => statusCode,
      getBody: () => body,
      getJson: () => (body ? JSON.parse(body) : {}),
      getHeaders: () => headers
    };
  }

  // ========================================================
  // 1. Successful Inference Proxy Requests (Mocked Upstream)
  // ========================================================
  describe('Inference Proxy Execution', () => {
    it('successfully forwards request to Hugging Face router with Gemma 3 12B Instruct', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Socratic guidance: consider the time complexity.' } }]
        })
      });
      globalThis.fetch = mockFetch;

      const result = await executeGemmaInference({
        prompt: 'How do I solve two sum?',
        systemPrompt: 'You are AlgoBuddy. Think first. Hint second. Solution last.',
        temperature: 0.3,
        maxTokens: 500
      });

      expect(result.success).toBe(true);
      expect(result.model).toBe('google/gemma-3-12b-it');
      expect(result.text).toBe('Socratic guidance: consider the time complexity.');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify payload sent to Hugging Face
      const callArgs = mockFetch.mock.calls[0];
      const sentUrl = callArgs[0];
      const sentOptions = callArgs[1];
      expect(sentUrl).toBe('https://router.huggingface.co/v1/chat/completions');
      expect(sentOptions.headers['Authorization']).toBe('Bearer hf_mock_token_for_test');

      const sentBody = JSON.parse(sentOptions.body);
      expect(sentBody.model).toBe('google/gemma-3-12b-it');
      expect(sentBody.messages[0]).toEqual({
        role: 'system',
        content: 'You are AlgoBuddy. Think first. Hint second. Solution last.'
      });
      expect(sentBody.messages[1]).toEqual({
        role: 'user',
        content: 'How do I solve two sum?'
      });
    });

    it('handles end-to-end handleGemmaRequest with HTTP 200 and JSON response', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Examine constraints first.' } }]
        })
      });

      const req = createMockRequest({
        body: { prompt: 'Help with binary search' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(200);
      const json = getJson();
      expect(json.success).toBe(true);
      expect(json.text).toBe('Examine constraints first.');
    });
  });

  // ========================================================
  // 2. Missing Server-Side Token Configuration
  // ========================================================
  describe('Missing Server-Side Token', () => {
    it('returns HTTP 401 with authentication category when HF_TOKEN is unset', async () => {
      delete process.env.HF_TOKEN;
      delete process.env.HUGGINGFACE_API_KEY;
      delete process.env.GEMMA_API_KEY;

      const req = createMockRequest({
        body: { prompt: 'Hello' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(401);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.statusCode).toBe(401);
      expect(json.errorCategory).toBe('authentication');
      expect(json.error).toContain('Hugging Face API token is required');
    });
  });

  // ========================================================
  // 3. Upstream Status Code Mapping (401, 402, 403, 429, 5xx)
  // ========================================================
  describe('Upstream Status Code Mapping', () => {
    it('preserves HTTP 402 credit exhaustion with billing category', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        text: async () => JSON.stringify({ error: 'You have no remaining credits.' })
      });

      const req = createMockRequest({
        body: { prompt: 'Hello' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(402);
      const json = getJson();
      expect(json.success).toBe(false);
      expect(json.statusCode).toBe(402);
      expect(json.errorCategory).toBe('billing');
      expect(json.error).toContain('HTTP 402');
      expect(json.error).toContain('You have no remaining credits');
    });

    it('maps HTTP 401 unauthorized to authentication category', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: 'Invalid token' })
      });

      const req = createMockRequest({
        body: { prompt: 'Hello' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(401);
      const json = getJson();
      expect(json.errorCategory).toBe('authentication');
      expect(json.error).toContain('Authentication failed');
    });

    it('maps HTTP 403 forbidden to permission category', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ error: 'Forbidden model access' })
      });

      const req = createMockRequest({
        body: { prompt: 'Hello' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(403);
      const json = getJson();
      expect(json.errorCategory).toBe('permission');
      expect(json.error).toContain('Access denied');
    });

    it('maps HTTP 429 upstream to rate_limit category', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: 'Rate limit exceeded' })
      });

      const req = createMockRequest({
        body: { prompt: 'Hello' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(429);
      const json = getJson();
      expect(json.errorCategory).toBe('rate_limit');
      expect(json.error).toContain('Rate limit exceeded');
    });

    it('maps HTTP 503 upstream to provider_down category', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => JSON.stringify({ error: 'Service Unavailable' })
      });

      const req = createMockRequest({
        body: { prompt: 'Hello' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(503);
      const json = getJson();
      expect(json.errorCategory).toBe('provider_down');
      expect(json.error).toContain('HTTP 503');
    });
  });

  // ========================================================
  // 4. Timeout and Network Failure Behavior
  // ========================================================
  describe('Timeout and Network Failures', () => {
    it('returns HTTP 504 with network category when upstream request times out', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      const timeoutError = new Error('The operation was aborted due to timeout');
      timeoutError.name = 'TimeoutError';
      globalThis.fetch = vi.fn().mockRejectedValue(timeoutError);

      const req = createMockRequest({
        body: { prompt: 'Hello' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(504);
      const json = getJson();
      expect(json.errorCategory).toBe('network');
      expect(json.error).toContain('timed out');
    });

    it('returns HTTP 503 with network category on connection reset / DNS failure', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND router.huggingface.co'));

      const req = createMockRequest({
        body: { prompt: 'Hello' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(503);
      const json = getJson();
      expect(json.errorCategory).toBe('network');
      expect(json.error).toContain('Network connectivity error');
    });
  });

  // ========================================================
  // 5. Payload Validation & Size Limits (HTTP 400 & HTTP 413)
  // ========================================================
  describe('Payload Validation & Size Limits', () => {
    it('rejects malformed non-JSON body with HTTP 400', async () => {
      const req = createMockRequest({
        body: '{ not valid json }'
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(400);
      expect(getJson().error).toContain('Malformed JSON payload');
    });

    it('rejects non-object payloads (e.g. array) with HTTP 400', async () => {
      const req = createMockRequest({
        body: [1, 2, 3]
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(400);
      expect(getJson().error).toContain('Expected a JSON object payload');
    });

    it('rejects unsupported action with HTTP 400', async () => {
      const req = createMockRequest({
        body: { action: 'destroy_database', prompt: 'test' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(400);
      expect(getJson().error).toContain('Invalid action');
    });

    it('rejects unsupported provider with HTTP 400', async () => {
      const req = createMockRequest({
        body: { provider: 'unknown_provider', prompt: 'test' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(400);
      expect(getJson().error).toContain('Unsupported provider');
    });

    it('rejects invalid message roles with HTTP 400', () => {
      const validation = validateGemmaPayload({
        messages: [{ role: 'admin', content: 'test' }]
      });
      expect(validation.valid).toBe(false);
      if (!validation.valid) {
        expect(validation.error).toContain("Expected 'system', 'user', or 'assistant'");
      }
    });

    it('rejects invalid temperature with HTTP 400', () => {
      const validation = validateGemmaPayload({
        prompt: 'test',
        temperature: 99
      });
      expect(validation.valid).toBe(false);
      if (!validation.valid) {
        expect(validation.error).toContain("Invalid 'temperature'");
      }
    });

    it('rejects oversized stream payload with HTTP 413 (Payload Too Large)', async () => {
      // Create a body exceeding MAX_BODY_BYTES (512 KB)
      const oversizedChunk = 'x'.repeat(MAX_BODY_BYTES + 1024);
      const req = createMockRequest({
        chunks: [oversizedChunk]
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(413);
      const json = getJson();
      expect(json.error).toContain('Payload Too Large');
    });

    it('rejects pre-parsed body exceeding MAX_BODY_BYTES with HTTP 413', async () => {
      const oversizedString = 'a'.repeat(MAX_BODY_BYTES + 2048);
      const req = createMockRequest({
        body: { prompt: oversizedString }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(413);
      expect(getJson().error).toContain('Payload Too Large');
    });
  });

  // ========================================================
  // 6. Secret Redaction & Token Sanitization
  // ========================================================
  describe('Secret Redaction', () => {
    it('redacts URL user credentials from error strings', () => {
      const sanitized = sanitizeSecret('Connection error to https://admin:supersecret123@router.huggingface.co/v1');
      expect(sanitized).not.toContain('supersecret123');
      expect(sanitized).toContain('https://[REDACTED]:[REDACTED]@');
    });

    it('redacts Bearer tokens in error messages', () => {
      const sanitized = sanitizeSecret('Failed request with header Authorization: Bearer hf_1234567890abcdef');
      expect(sanitized).not.toContain('hf_1234567890abcdef');
      expect(sanitized).toContain('Bearer [REDACTED]');
    });

    it('redacts live active environment secret if present in error message', () => {
      process.env.HF_TOKEN = 'hf_custom_secret_token_12345';
      const sanitized = sanitizeSecret('Error: Token hf_custom_secret_token_12345 rejected by endpoint');
      expect(sanitized).not.toContain('hf_custom_secret_token_12345');
      expect(sanitized).toContain('[REDACTED]');
    });
  });

  // ========================================================
  // 7. Abuse Protection & In-Memory Rate Limiting
  // ========================================================
  describe('Abuse Protection & Rate Limiting', () => {
    it('extracts client IP correctly from headers with proxy trust', () => {
      // 1. x-vercel-ip has highest precedence (set by Vercel edge)
      const reqWithVercelIp = {
        headers: {
          'x-vercel-ip': '203.0.113.88',
          'x-real-ip': '198.51.100.22',
          'x-forwarded-for': '1.2.3.4, 5.6.7.8'
        }
      } as unknown as IncomingMessage;
      expect(getClientIp(reqWithVercelIp)).toBe('203.0.113.88');

      // 2. x-real-ip has precedence over spoofed x-forwarded-for
      const reqWithRealIp = {
        headers: {
          'x-real-ip': '198.51.100.22',
          'x-forwarded-for': '1.2.3.4, 5.6.7.8'
        }
      } as unknown as IncomingMessage;
      expect(getClientIp(reqWithRealIp)).toBe('198.51.100.22');

      // 3. In x-forwarded-for chain, rightmost IP is taken (preventing client-prepended spoofing)
      const reqChain = {
        headers: { 'x-forwarded-for': '1.1.1.1, 203.0.113.195' }
      } as unknown as IncomingMessage;
      expect(getClientIp(reqChain)).toBe('203.0.113.195');

      // 4. Direct socket address fallback
      const reqDirect = {
        headers: {},
        socket: { remoteAddress: '192.168.1.50' }
      } as unknown as IncomingMessage;
      expect(getClientIp(reqDirect)).toBe('192.168.1.50');
    });

    it('enforces in-memory rate limits and returns HTTP 429 when quota exceeded', async () => {
      process.env.RATE_LIMIT_MAX = '3';
      process.env.RATE_LIMIT_WINDOW_MS = '60000';
      process.env.HF_TOKEN = 'hf_mock_token_for_test';

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'Response' } }] })
      });

      const clientHeaders = { 'x-real-ip': '198.51.100.99' };

      // First 3 requests should pass
      for (let i = 0; i < 3; i++) {
        const req = createMockRequest({
          headers: clientHeaders,
          body: { prompt: `Test ${i}` }
        });
        const { res, getStatusCode } = createMockResponse();
        await handleGemmaRequest(req, res);
        expect(getStatusCode()).toBe(200);
      }

      // 4th request must be rate limited with HTTP 429
      const reqOverLimit = createMockRequest({
        headers: clientHeaders,
        body: { prompt: 'Overflow request' }
      });
      const { res: resOver, getStatusCode: getCodeOver, getJson: getJsonOver, getHeaders } = createMockResponse();

      await handleGemmaRequest(reqOverLimit, resOver);

      expect(getCodeOver()).toBe(429);
      const json = getJsonOver();
      expect(json.statusCode).toBe(429);
      expect(json.errorCategory).toBe('rate_limit');
      expect(json.error).toContain('Too many requests');

      const headers = getHeaders();
      expect(headers['retry-after']).toBeDefined();
      expect(headers['x-ratelimit-remaining']).toBe('0');
      expect(headers['x-ratelimit-limit']).toBe('3');
    });
  });

  // ========================================================
  // 8. CORS and Origin Resolution
  // ========================================================
  describe('CORS and Origin Resolution', () => {
    it('resolves wildcard or defaults when ALLOWED_ORIGINS is unset', () => {
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.ALLOWED_ORIGIN;
      delete process.env.CORS_ORIGIN;
      expect(resolveCorsOrigin('https://example.com')).toBe('https://example.com');
      expect(resolveCorsOrigin(undefined)).toBe('*');
    });

    it('permits same-origin requests matching Host header', () => {
      process.env.ALLOWED_ORIGINS = 'https://algobuddy.vercel.app';
      expect(resolveCorsOrigin('https://my-domain.com', 'my-domain.com')).toBe('https://my-domain.com');
    });

    it('restricts to whitelisted origins and rejects unapproved origins when ALLOWED_ORIGINS is configured', () => {
      process.env.ALLOWED_ORIGINS = 'https://algobuddy.vercel.app,https://algobuddy.com';
      expect(resolveCorsOrigin('https://algobuddy.vercel.app')).toBe('https://algobuddy.vercel.app');
      expect(resolveCorsOrigin('https://algobuddy.com')).toBe('https://algobuddy.com');
      // Unauthorized origin receives empty string (no CORS header returned)
      expect(resolveCorsOrigin('https://malicious-site.com')).toBe('');
    });

    it('handles OPTIONS preflight from approved origin with HTTP 204 and Access-Control-Max-Age', async () => {
      process.env.ALLOWED_ORIGINS = 'https://algobuddy.vercel.app';
      const req = createMockRequest({
        method: 'OPTIONS',
        headers: { origin: 'https://algobuddy.vercel.app' }
      });
      const { res, getStatusCode, getHeaders } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(204);
      const headers = getHeaders();
      expect(headers['access-control-allow-origin']).toBe('https://algobuddy.vercel.app');
      expect(headers['access-control-allow-methods']).toContain('POST');
      expect(headers['access-control-max-age']).toBe('86400');
    });

    it('rejects OPTIONS preflight from unapproved origin with HTTP 403', async () => {
      process.env.ALLOWED_ORIGINS = 'https://algobuddy.vercel.app';
      const req = createMockRequest({
        method: 'OPTIONS',
        headers: { origin: 'https://attacker.evil.com' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(403);
      expect(getJson().error).toContain('CORS origin not allowed');
    });
  });

  // ========================================================
  // 9. Gateway Readiness Diagnostics & Safe GET Health
  // ========================================================
  describe('Gateway Diagnostics & Health', () => {
    it('GET /api/gemma returns gateway readiness without making upstream fetch calls', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      const req = createMockRequest({
        method: 'GET',
        url: '/api/gemma'
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(200);
      const json = getJson();
      expect(json.status).toBe('configured');
      expect(json.provider).toBe('huggingface');
      expect(json.model).toBe('google/gemma-3-12b-it');
      expect(json.openModelName).toContain('Google Gemma 3');
      expect(json.message).toContain('Server credentials configured');

      // Crucial: GET /api/gemma diagnostic must NOT consume upstream tokens
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('GET /api/gemma returns unconfigured status when HF_TOKEN is absent', async () => {
      delete process.env.HF_TOKEN;
      delete process.env.HUGGINGFACE_API_KEY;
      delete process.env.GEMMA_API_KEY;

      const diagnostics = getGatewayDiagnostics();
      expect(diagnostics.status).toBe('unconfigured');
      expect(diagnostics.message).toContain('No API token found on server');
    });

    it('GET /api/gemma?upstream=true triggers active upstream ping when requested', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({})
      });

      const req = createMockRequest({
        method: 'GET',
        url: '/api/gemma?upstream=true'
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(200);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(getJson().status).toBe('connected');
    });

    it('POST with action: health triggers active connection test for in-app SettingsModal', async () => {
      process.env.HF_TOKEN = 'hf_mock_token_for_test';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({})
      });

      const req = createMockRequest({
        body: { action: 'health' }
      });
      const { res, getStatusCode, getJson } = createMockResponse();

      await handleGemmaRequest(req, res);

      expect(getStatusCode()).toBe(200);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(getJson().status).toBe('connected');
    });
  });

  // ========================================================
  // 10. Production Routing & Vercel Configuration Verification
  // ========================================================
  describe('Production Routing & Vercel Configuration', () => {
    it('verifies vercel.json specifies Vite framework, output directory, and safe rewrites', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const vercelJsonPath = path.resolve(process.cwd(), 'vercel.json');
      const content = await fs.readFile(vercelJsonPath, 'utf8');
      const vercelConfig = JSON.parse(content);

      expect(vercelConfig.framework).toBe('vite');
      expect(vercelConfig.buildCommand).toBe('npm run build');
      expect(vercelConfig.outputDirectory).toBe('dist');

      // Verify rewrites structure
      const rewrites = vercelConfig.rewrites;
      expect(Array.isArray(rewrites)).toBe(true);

      const apiRewrite = rewrites.find((r: any) => r.source === '/api/(.*)');
      expect(apiRewrite).toBeDefined();
      expect(apiRewrite.destination).toBe('/api/$1');

      // Verify SPA fallback uses negative lookahead to exclude /api routes
      const spaRewrite = rewrites.find((r: any) => r.destination === '/index.html');
      expect(spaRewrite).toBeDefined();
      expect(spaRewrite.source).toContain('(?!api');

      // Test regex pattern against API and client paths
      const spaRegex = new RegExp(`^${spaRewrite.source.replace('(.*)', '.*')}$`);
      expect(spaRegex.test('/workspace')).toBe(true);
      expect(spaRegex.test('/concept')).toBe(true);
      expect(spaRegex.test('/code')).toBe(true);
      expect(spaRegex.test('/progress')).toBe(true);
      expect(spaRegex.test('/problems/two-sum')).toBe(true);
      // API paths MUST NOT match the SPA fallback regex
      expect(spaRegex.test('/api/gemma')).toBe(false);
      expect(spaRegex.test('/api/unknown')).toBe(false);
      expect(spaRegex.test('/api')).toBe(false);
    });
  });
});
