import type { IncomingMessage, ServerResponse } from 'node:http';

// Attempt to load .env on server initialization if native process.loadEnvFile is present
try {
  // @ts-ignore
  if (typeof process.loadEnvFile === 'function') {
    // @ts-ignore
    process.loadEnvFile();
  }
} catch {
  // .env may not exist or is already loaded by Vite/Vercel
}

export const DEFAULT_GEMMA_PROVIDER = 'huggingface';
export const DEFAULT_GEMMA_MODEL = 'google/gemma-3-12b-it';
export const DEFAULT_HF_ROUTER_ENDPOINT = 'https://router.huggingface.co/v1';

// Official Groq Cloud configuration (Free Tier, GPT OSS 20B, ₹0 Budget)
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';
export const DEFAULT_GROQ_ENDPOINT = 'https://api.groq.com/openai/v1';

// Request body size limit: 512 KB
export const MAX_BODY_BYTES = 512 * 1024;

// Default in-memory rate limiting: 60 requests per minute per IP
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const DEFAULT_RATE_LIMIT_MAX = 60;

export type GemmaErrorCategory =
  | 'billing'
  | 'authentication'
  | 'permission'
  | 'rate_limit'
  | 'provider_down'
  | 'network'
  | 'bad_request';

export class GemmaProviderError extends Error {
  statusCode: number;
  errorCategory: GemmaErrorCategory;
  provider: string;
  model: string;
  details?: string;

  constructor(
    message: string,
    statusCode: number,
    errorCategory: GemmaErrorCategory,
    provider: string,
    model: string,
    details?: string
  ) {
    super(message);
    this.name = 'GemmaProviderError';
    this.statusCode = statusCode;
    this.errorCategory = errorCategory;
    this.provider = provider;
    this.model = model;
    this.details = details;
  }
}

export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GemmaRequestBody {
  action?: 'chat' | 'health' | 'code_analysis';
  messages?: ChatMessagePayload[];
  systemPrompt?: string;
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: 'groq' | 'huggingface' | 'openrouter' | 'ollama' | 'custom';
  model?: string;
  apiKey?: string;
  endpoint?: string;
}

export interface GemmaHealthResponse {
  status: 'connected' | 'configured' | 'unconfigured' | 'warning' | 'error';
  statusCode?: number;
  errorCategory?: GemmaErrorCategory;
  provider: string;
  model: string;
  endpoint: string;
  openModelName: string;
  message: string;
}

export const config = {
  maxDuration: 60,
};

// ========================================================
// Abuse Protection: In-Memory Per-Instance Rate Limiter
// ========================================================
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const ipRateLimits = new Map<string, RateLimitRecord>();

/**
 * Checks in-memory rate limit for a client IP.
 * NOTE ON SERVERLESS RUNTIMES (such as Vercel):
 * This in-memory limiter provides per-container abuse and denial-of-service protection
 * against rapid automated bursts. Because serverless functions scale horizontally and
 * containers recycle on cold starts, in-memory state is local to each instance.
 * For globally synchronized limits across multi-region serverless fleets, edge WAF
 * (e.g. Vercel Firewall / Cloudflare WAF) or a distributed Redis store (e.g. Upstash)
 * is recommended.
 */
export function checkRateLimit(clientIp: string): {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || DEFAULT_RATE_LIMIT_WINDOW_MS;
  const maxRequests = Number(process.env.RATE_LIMIT_MAX) || DEFAULT_RATE_LIMIT_MAX;
  const now = Date.now();

  const record = ipRateLimits.get(clientIp);
  if (!record || now > record.resetAt) {
    ipRateLimits.set(clientIp, { count: 1, resetAt: now + windowMs });
    if (ipRateLimits.size > 2000) {
      for (const [ip, entry] of ipRateLimits.entries()) {
        if (now > entry.resetAt) ipRateLimits.delete(ip);
      }
    }
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: Math.ceil((now + windowMs) / 1000)
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      reset: Math.ceil(record.resetAt / 1000)
    };
  }

  record.count += 1;
  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    reset: Math.ceil(record.resetAt / 1000)
  };
}

export function resetRateLimits(): void {
  ipRateLimits.clear();
}

export function getClientIp(req: IncomingMessage): string {
  // Trusted proxy edge headers (Vercel edge sets x-real-ip and x-vercel-ip reliably)
  const xVercelIp = req.headers?.['x-vercel-ip'];
  if (typeof xVercelIp === 'string' && xVercelIp.trim()) {
    return xVercelIp.trim();
  }

  const xRealIp = req.headers?.['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim()) {
    return xRealIp.trim();
  }

  // Fallback to x-forwarded-for
  // In reverse proxy chains, the rightmost IP before the trusted edge is the most tamper-resistant
  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    const ips = xForwardedFor.split(',').map((ip) => ip.trim()).filter(Boolean);
    if (ips.length > 0) {
      return ips[ips.length - 1];
    }
  }
  if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    return xForwardedFor[xForwardedFor.length - 1].trim();
  }

  return req.socket?.remoteAddress || '127.0.0.1';
}

// ========================================================
// CORS & Origin Resolution
// ========================================================
export function resolveCorsOrigin(reqOrigin?: string, hostHeader?: string): string {
  // If no Origin header, it is a same-origin request or direct non-browser client
  if (!reqOrigin) {
    return '*';
  }

  // Same-origin verification: if Origin matches Host header, always permit
  if (hostHeader) {
    const cleanHost = hostHeader.toLowerCase().trim();
    if (
      reqOrigin.toLowerCase() === `https://${cleanHost}` ||
      reqOrigin.toLowerCase() === `http://${cleanHost}`
    ) {
      return reqOrigin;
    }
  }

  const envAllowed = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || process.env.CORS_ORIGIN;
  if (!envAllowed || envAllowed.trim() === '*' || envAllowed.trim() === '') {
    return reqOrigin;
  }

  const allowedList = envAllowed.split(',').map((o) => o.trim().toLowerCase());
  if (allowedList.includes(reqOrigin.toLowerCase())) {
    return reqOrigin;
  }

  if (process.env.NODE_ENV !== 'production') {
    if (reqOrigin.startsWith('http://localhost:') || reqOrigin.startsWith('http://127.0.0.1:')) {
      return reqOrigin;
    }
  }

  // For unapproved cross-origin requests, return empty string so no CORS permission is granted
  return '';
}

// ========================================================
// Payload Schema Validation (Discriminated Union)
// ========================================================
export interface ValidationSuccess {
  valid: true;
  data: GemmaRequestBody;
  error?: never;
}

export interface ValidationError {
  valid: false;
  error: string;
  data?: never;
}

export type PayloadValidationResult = ValidationSuccess | ValidationError;

export function validateGemmaPayload(body: unknown): PayloadValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Malformed request: Expected a JSON object payload.' };
  }

  const b = body as Record<string, unknown>;

  if (b.action !== undefined) {
    if (typeof b.action !== 'string' || !['chat', 'health', 'code_analysis'].includes(b.action)) {
      return { valid: false, error: "Invalid action. Supported actions are 'chat', 'health', and 'code_analysis'." };
    }
  }

  if (b.provider !== undefined) {
    if (typeof b.provider !== 'string' || !['groq', 'huggingface', 'openrouter', 'ollama', 'custom'].includes(b.provider)) {
      return { valid: false, error: "Unsupported provider. Supported providers are 'groq', 'huggingface', 'openrouter', 'ollama', and 'custom'." };
    }
  }

  if (b.messages !== undefined) {
    if (!Array.isArray(b.messages)) {
      return { valid: false, error: "Invalid 'messages' field: Must be an array of chat messages." };
    }
    if (b.messages.length > 50) {
      return { valid: false, error: "Too many messages: Maximum allowed conversation history is 50 messages." };
    }
    for (let i = 0; i < b.messages.length; i++) {
      const msg = b.messages[i];
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
        return { valid: false, error: `Invalid message at index ${i}: Must be an object with 'role' and 'content'.` };
      }
      const role = (msg as { role?: unknown }).role;
      const content = (msg as { content?: unknown }).content;
      if (typeof role !== 'string' || !['system', 'user', 'assistant'].includes(role)) {
        return { valid: false, error: `Invalid role at message index ${i}: Expected 'system', 'user', or 'assistant'.` };
      }
      if (typeof content !== 'string') {
        return { valid: false, error: `Invalid content at message index ${i}: Expected string content.` };
      }
      if (content.length > 40000) {
        return { valid: false, error: `Message at index ${i} exceeds maximum length (40,000 characters).` };
      }
    }
  }

  if (b.prompt !== undefined) {
    if (typeof b.prompt !== 'string') {
      return { valid: false, error: "Invalid 'prompt' field: Expected string." };
    }
    if (b.prompt.length > 40000) {
      return { valid: false, error: "Prompt exceeds maximum length (40,000 characters)." };
    }
  }

  if (b.systemPrompt !== undefined) {
    if (typeof b.systemPrompt !== 'string') {
      return { valid: false, error: "Invalid 'systemPrompt' field: Expected string." };
    }
    if (b.systemPrompt.length > 40000) {
      return { valid: false, error: "System prompt exceeds maximum length (40,000 characters)." };
    }
  }

  if (b.temperature !== undefined) {
    if (typeof b.temperature !== 'number' || isNaN(b.temperature) || b.temperature < 0 || b.temperature > 2) {
      return { valid: false, error: "Invalid 'temperature' field: Must be a number between 0 and 2.0." };
    }
  }

  if (b.maxTokens !== undefined) {
    if (typeof b.maxTokens !== 'number' || isNaN(b.maxTokens) || !Number.isInteger(b.maxTokens) || b.maxTokens < 1 || b.maxTokens > 8192) {
      return { valid: false, error: "Invalid 'maxTokens' field: Must be an integer between 1 and 8192." };
    }
  }

  if (b.apiKey !== undefined && typeof b.apiKey !== 'string') {
    return { valid: false, error: "Invalid 'apiKey' field: Expected string." };
  }

  if (b.model !== undefined && (typeof b.model !== 'string' || b.model.length > 200)) {
    return { valid: false, error: "Invalid 'model' field: Expected string up to 200 characters." };
  }

  if (b.endpoint !== undefined && (typeof b.endpoint !== 'string' || b.endpoint.length > 500)) {
    return { valid: false, error: "Invalid 'endpoint' field: Expected string URL." };
  }

  return { valid: true, data: b as GemmaRequestBody };
}

// ========================================================
// Gateway Readiness Diagnostic (Safe, No Upstream Cost)
// ========================================================
// Gateway Readiness & Diagnostic Information (Zero Inference Calls)
// ========================================================
export function getGatewayDiagnostics(providerOverride?: string): GemmaHealthResponse {
  const provider = (providerOverride && ['groq', 'huggingface', 'openrouter', 'ollama', 'custom'].includes(providerOverride.toLowerCase()))
    ? (providerOverride.toLowerCase() as 'groq' | 'huggingface' | 'openrouter' | 'ollama' | 'custom')
    : getEnvProvider();
  const hasToken = Boolean(getEnvApiKey(provider));
  const model = getEnvModel(provider);
  const endpoint = getEnvEndpoint(provider);

  const openModelName = provider === 'groq'
    ? `GPT OSS (${model}) via Groq Cloud (Free Tier)`
    : 'Google Gemma 3 12B Instruct (Hosted Open Weights)';

  return {
    status: hasToken ? 'configured' : 'unconfigured',
    statusCode: 200,
    provider,
    model,
    endpoint: resolveEndpoint(endpoint),
    openModelName,
    message: hasToken
      ? (provider === 'groq'
          ? `AlgoBuddy Groq inference gateway is ready (provider: groq, model: ${model}). Server credentials configured. Strict ₹0 budget.`
          : `AlgoBuddy Gemma inference gateway is ready (provider: ${provider}, model: ${model}). Server credentials configured.`)
      : (provider === 'groq'
          ? `No Groq API key found on server. Configure GROQ_API_KEY in environment variables, or enter key in Settings.`
          : `No API token found on server. Configure HF_TOKEN or HUGGINGFACE_API_KEY in environment variables, or enter token in Settings.`)
  };
}

// ========================================================
// HTTP Request Handler
// ========================================================
export async function handleGemmaRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const originHeader = req.headers && typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  const hostHeader = req.headers && typeof req.headers.host === 'string' ? req.headers.host : undefined;
  const corsOrigin = resolveCorsOrigin(originHeader, hostHeader);

  // Set hardened security & CORS headers
  res.setHeader('Content-Type', 'application/json');
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    if (originHeader && !corsOrigin) {
      res.statusCode = 403;
      res.end(JSON.stringify({ success: false, statusCode: 403, errorCategory: 'permission', error: 'CORS origin not allowed' }));
      return;
    }
    res.setHeader('Access-Control-Max-Age', '86400');
    res.statusCode = 204;
    res.end();
    return;
  }

  // Rate limiting abuse protection (per client IP)
  const clientIp = getClientIp(req);
  const rateCheck = checkRateLimit(clientIp);
  res.setHeader('X-RateLimit-Limit', String(rateCheck.limit));
  res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
  res.setHeader('X-RateLimit-Reset', String(rateCheck.reset));

  if (!rateCheck.allowed) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(Math.max(1, rateCheck.reset - Math.floor(Date.now() / 1000))));
    res.end(JSON.stringify({
      success: false,
      statusCode: 429,
      errorCategory: 'rate_limit',
      error: 'Too many requests. Please slow down and try again shortly.',
      details: 'Per-instance rate limit exceeded. Burst protection active.'
    }));
    return;
  }

  try {
    // Handle health check on GET /api/gemma
    if (req.method === 'GET') {
      try {
        const urlObj = new URL(req.url || '/', 'http://localhost');
        const checkUpstream = urlObj.searchParams.get('upstream') === 'true' || urlObj.searchParams.get('test') === 'true';
        const queryProvider = urlObj.searchParams.get('provider') || undefined;

        if (checkUpstream) {
          const health = await checkHealth({ provider: queryProvider as any });
          res.statusCode = health.statusCode && health.status === 'error' ? health.statusCode : 200;
          res.end(JSON.stringify(health));
        } else {
          const diagnostics = getGatewayDiagnostics(queryProvider);
          res.statusCode = 200;
          res.end(JSON.stringify(diagnostics));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.statusCode = 500;
        res.end(JSON.stringify({
          status: 'error',
          statusCode: 500,
          errorCategory: 'provider_down',
          provider: getEnvProvider(),
          model: getEnvModel(getEnvProvider()),
          message: `Health check error: ${sanitizeSecret(msg)}`
        }));
      }
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ success: false, statusCode: 405, errorCategory: 'bad_request', error: 'Method not allowed' }));
      return;
    }

    // Read request body with size limit enforcement (handles both Vercel pre-parsed req.body and raw Node stream)
    let body: GemmaRequestBody = {};
    const reqWithBody = req as { body?: unknown };
    if (reqWithBody.body !== undefined && reqWithBody.body !== null) {
      if (typeof reqWithBody.body === 'object') {
        const bodyStr = JSON.stringify(reqWithBody.body);
        if (Buffer.byteLength(bodyStr, 'utf8') > MAX_BODY_BYTES) {
          res.statusCode = 413;
          res.end(JSON.stringify({
            success: false,
            statusCode: 413,
            errorCategory: 'bad_request',
            error: `Payload Too Large: Request body exceeds the maximum permitted size of ${MAX_BODY_BYTES / 1024} KB.`
          }));
          return;
        }
        body = reqWithBody.body as GemmaRequestBody;
      } else if (typeof reqWithBody.body === 'string') {
        if (Buffer.byteLength(reqWithBody.body, 'utf8') > MAX_BODY_BYTES) {
          res.statusCode = 413;
          res.end(JSON.stringify({
            success: false,
            statusCode: 413,
            errorCategory: 'bad_request',
            error: `Payload Too Large: Request body exceeds the maximum permitted size of ${MAX_BODY_BYTES / 1024} KB.`
          }));
          return;
        }
        try {
          body = reqWithBody.body ? JSON.parse(reqWithBody.body) : {};
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, statusCode: 400, errorCategory: 'bad_request', error: 'Malformed JSON payload' }));
          return;
        }
      }
    } else {
      let bodyStr = '';
      let bytesRead = 0;
      try {
        for await (const chunk of req) {
          const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
          bytesRead += buf.length;
          if (bytesRead > MAX_BODY_BYTES) {
            res.statusCode = 413;
            res.end(JSON.stringify({
              success: false,
              statusCode: 413,
              errorCategory: 'bad_request',
              error: `Payload Too Large: Request body exceeds the maximum permitted size of ${MAX_BODY_BYTES / 1024} KB.`
            }));
            return;
          }
          bodyStr += chunk;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, statusCode: 400, errorCategory: 'bad_request', error: `Failed to read request body: ${sanitizeSecret(msg)}` }));
        return;
      }

      try {
        body = bodyStr ? JSON.parse(bodyStr) : {};
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, statusCode: 400, errorCategory: 'bad_request', error: 'Malformed JSON payload' }));
        return;
      }
    }

    // Schema and boundary validation (Discriminated-union narrowing)
    const validation = validateGemmaPayload(body);
    if (validation.valid === false) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        success: false,
        statusCode: 400,
        errorCategory: 'bad_request',
        error: validation.error
      }));
      return;
    }
    body = validation.data;

    if (body.action === 'health') {
      const health = await checkHealth(body);
      res.statusCode = health.statusCode && health.status === 'error' ? health.statusCode : 200;
      res.end(JSON.stringify(health));
      return;
    }

    try {
      const result = await executeGemmaInference(body);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (err: unknown) {
      if (err instanceof GemmaProviderError) {
        // Return the actual upstream status code (e.g. 402, 401, 403, 429, 500)
        res.statusCode = err.statusCode;
        res.end(JSON.stringify({
          success: false,
          statusCode: err.statusCode,
          errorCategory: err.errorCategory,
          error: sanitizeSecret(err.message),
          details: err.details ? sanitizeSecret(err.details) : undefined,
          provider: err.provider,
          model: err.model
        }));
        return;
      }

      const message = err instanceof Error ? err.message : String(err);
      res.statusCode = 400;
      res.end(JSON.stringify({
        success: false,
        statusCode: 400,
        errorCategory: 'bad_request',
        error: sanitizeSecret(message),
        provider: body.provider || getEnvProvider(),
        model: body.model || getEnvModel(body.provider || getEnvProvider())
      }));
    }
  } catch (fatalErr: unknown) {
    // Top-level catch guarantee: never crash the serverless function process
    const fatalMsg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    res.statusCode = 500;
    res.end(JSON.stringify({
      success: false,
      statusCode: 500,
      errorCategory: 'provider_down',
      error: `Server handler error: ${sanitizeSecret(fatalMsg)}`,
      provider: getEnvProvider(),
      model: getEnvModel(getEnvProvider())
    }));
  }
}

export async function checkHealth(body?: GemmaRequestBody): Promise<GemmaHealthResponse> {
  const provider = body?.provider || getEnvProvider();
  const apiKey = body?.apiKey || getEnvApiKey(provider);
  const endpoint = body?.endpoint || getEnvEndpoint(provider);
  const model = body?.model || getEnvModel(provider);

  if (provider === 'groq') {
    if (!apiKey) {
      return {
        status: 'unconfigured',
        statusCode: 401,
        errorCategory: 'authentication',
        provider: 'groq',
        model,
        endpoint: resolveEndpoint(endpoint),
        openModelName: `GPT OSS (${model}) via Groq (Free Tier)`,
        message: 'No Groq API key found. Set GROQ_API_KEY in server .env (get a free key at https://console.groq.com/keys) or enter your key in Settings.'
      };
    }
    return {
      status: 'configured',
      statusCode: 200,
      provider: 'groq',
      model,
      endpoint: resolveEndpoint(endpoint),
      openModelName: `GPT OSS (${model}) via Groq (Free Tier)`,
      message: `Configured for Groq free-tier hosted inference using ${model}. Strict ₹0 budget.`
    };
  }

  if (provider === 'huggingface') {
    if (!apiKey) {
      return {
        status: 'unconfigured',
        statusCode: 401,
        errorCategory: 'authentication',
        provider: 'huggingface',
        model,
        endpoint: resolveEndpoint(endpoint),
        openModelName: 'Google Gemma 3 12B Instruct (Hosted Open Weights)',
        message: 'No Hugging Face token found. Set HF_TOKEN or HUGGINGFACE_API_KEY in server .env, or enter your token in Settings.'
      };
    }

    // Ping the Hugging Face router to verify token and model availability
    try {
      const chatUrl = resolveEndpoint(endpoint);
      const testRes = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (testRes.status === 401) {
        return {
          status: 'error',
          statusCode: 401,
          errorCategory: 'authentication',
          provider: 'huggingface',
          model,
          endpoint: chatUrl,
          openModelName: 'Google Gemma 3 12B Instruct (Hosted Open Weights)',
          message: 'Hugging Face authentication failed (401 Unauthorized). Please check your HF token in .env or Settings.'
        };
      }

      if (testRes.status === 402) {
        const errText = await testRes.text().catch(() => '');
        let errMsg = errText.slice(0, 300);
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error?.message || parsed.error || errMsg;
        } catch {
          // not JSON
        }
        return {
          status: 'error',
          statusCode: 402,
          errorCategory: 'billing',
          provider: 'huggingface',
          model,
          endpoint: chatUrl,
          openModelName: 'Google Gemma 3 12B Instruct (Hosted Open Weights)',
          message: `Hugging Face router returned HTTP 402: ${sanitizeSecret(errMsg || 'You have no remaining credits.')}`
        };
      }

      if (!testRes.ok) {
        const errText = await testRes.text().catch(() => '');
        let errMsg = errText.slice(0, 300);
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error?.message || parsed.error || errMsg;
        } catch {
          // not JSON
        }
        const cat: GemmaErrorCategory = testRes.status === 403
          ? 'permission'
          : testRes.status === 429
          ? 'rate_limit'
          : testRes.status >= 500
          ? 'provider_down'
          : 'bad_request';

        return {
          status: 'error',
          statusCode: testRes.status,
          errorCategory: cat,
          provider: 'huggingface',
          model,
          endpoint: chatUrl,
          openModelName: 'Google Gemma 3 12B Instruct (Hosted Open Weights)',
          message: `Hugging Face router returned HTTP ${testRes.status}: ${sanitizeSecret(errMsg)}`
        };
      }

      return {
        status: 'connected',
        statusCode: 200,
        provider: 'huggingface',
        model,
        endpoint: chatUrl,
        openModelName: 'Google Gemma 3 12B Instruct (Hosted Open Weights)',
        message: `Successfully connected to real Google Gemma (${model}) via Hugging Face Inference Providers!`
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: 'error',
        statusCode: 503,
        errorCategory: 'network',
        provider: 'huggingface',
        model,
        endpoint: resolveEndpoint(endpoint),
        openModelName: 'Google Gemma 3 12B Instruct (Hosted Open Weights)',
        message: `Network error reaching Hugging Face router: ${sanitizeSecret(msg)}`
      };
    }
  }

  if (provider === 'openrouter') {
    if (!apiKey) {
      return {
        status: 'unconfigured',
        statusCode: 401,
        errorCategory: 'authentication',
        provider: 'openrouter',
        model,
        endpoint: resolveEndpoint(endpoint),
        openModelName: `Google Gemma (${model}) via OpenRouter`,
        message: 'OpenRouter API Key is required. Set OPENROUTER_API_KEY in .env or Settings.'
      };
    }
    return {
      status: 'configured',
      statusCode: 200,
      provider: 'openrouter',
      model,
      endpoint: resolveEndpoint(endpoint),
      openModelName: `Google Gemma (${model}) via OpenRouter`,
      message: `Configured to run ${model} via OpenRouter`
    };
  }

  if (provider === 'ollama') {
    return {
      status: 'warning',
      statusCode: 200,
      provider: 'ollama',
      model,
      endpoint,
      openModelName: 'Google Gemma (Local Weights via Ollama)',
      message: 'Local Ollama is optional for high-RAM environments. Recommended primary method is Hugging Face Inference Providers.'
    };
  }

  if (!apiKey) {
    return {
      status: 'unconfigured',
      statusCode: 401,
      errorCategory: 'authentication',
      provider,
      model,
      endpoint: resolveEndpoint(endpoint),
      openModelName: `Google Gemma (${model})`,
      message: `No API key found for ${provider.toUpperCase()}. Set credentials in .env or Settings.`
    };
  }

  return {
    status: 'configured',
    statusCode: 200,
    provider,
    model,
    endpoint: resolveEndpoint(endpoint),
    openModelName: `Google Gemma (${model})`,
    message: `Ready for inference via ${provider.toUpperCase()}`
  };
}

export async function executeGemmaInference(body: GemmaRequestBody) {
  const provider = body.provider || getEnvProvider();
  const apiKey = body.apiKey || getEnvApiKey(provider);
  const endpoint = body.endpoint || getEnvEndpoint(provider);
  const model = body.model || getEnvModel(provider);

  // Prepare standard OpenAI-compatible messages array
  const messages: ChatMessagePayload[] = [];
  if (body.systemPrompt) {
    messages.push({ role: 'system', content: body.systemPrompt });
  }

  if (body.messages && body.messages.length > 0) {
    messages.push(...body.messages);
  } else if (body.prompt) {
    messages.push({ role: 'user', content: body.prompt });
  }

  if (messages.length === 0) {
    throw new GemmaProviderError('No prompt or messages provided for inference', 400, 'bad_request', provider, model);
  }

  let apiUrl = '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (provider === 'groq') {
    if (!apiKey) {
      throw new GemmaProviderError(
        'Groq API key is required for free-tier hosted inference. ' +
        'Set GROQ_API_KEY in your server .env file (get a free key at https://console.groq.com/keys), or enter your key in Settings (⚙️).',
        401,
        'authentication',
        provider,
        model
      );
    }
    apiUrl = resolveEndpoint(endpoint);
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider === 'huggingface') {
    if (!apiKey) {
      throw new GemmaProviderError(
        'Hugging Face API token is required for hosted Gemma inference. ' +
        'Set HF_TOKEN or HUGGINGFACE_API_KEY in your server .env file, or enter your token in Settings (⚙️).',
        401,
        'authentication',
        provider,
        model
      );
    }
    apiUrl = resolveEndpoint(endpoint);
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider === 'openrouter') {
    if (!apiKey) {
      throw new GemmaProviderError('OpenRouter API Key is required. Set OPENROUTER_API_KEY in .env or Settings.', 401, 'authentication', provider, model);
    }
    apiUrl = resolveEndpoint(endpoint);
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = 'http://localhost:5173';
    headers['X-Title'] = 'AlgoBuddy - Open Model DSA Mentor';
  } else if (provider === 'ollama') {
    apiUrl = `${endpoint.replace(/\/+$/, '')}/v1/chat/completions`;
  } else if (provider === 'custom') {
    apiUrl = resolveEndpoint(endpoint);
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  } else {
    throw new GemmaProviderError(`Unsupported provider '${provider}'. Supported providers are 'huggingface', 'openrouter', 'ollama', 'custom'.`, 400, 'bad_request', provider, model);
  }

  const payload = {
    model,
    messages,
    temperature: body.temperature ?? 0.3,
    max_tokens: body.maxTokens ?? 1200
  };

  let apiRes: Response;
  try {
    apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000)
    });
  } catch (fetchErr: unknown) {
    if (fetchErr instanceof GemmaProviderError) throw fetchErr;
    const isTimeout = fetchErr instanceof Error && (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError');
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    throw new GemmaProviderError(
      isTimeout ? `Request to ${provider.toUpperCase()} timed out after 45s.` : `Network connectivity error reaching ${provider.toUpperCase()}: ${sanitizeSecret(msg)}`,
      isTimeout ? 504 : 503,
      'network',
      provider,
      model
    );
  }

  if (!apiRes.ok) {
    const errBody = await apiRes.text().catch(() => '');
    let parsedErrMsg = errBody.slice(0, 500);
    try {
      const errJson = JSON.parse(errBody);
      parsedErrMsg = errJson.error?.message || errJson.error || errJson.message || parsedErrMsg;
    } catch {
      // not JSON
    }

    const sanitizedMsg = sanitizeSecret(parsedErrMsg);
    let category: GemmaErrorCategory = 'bad_request';
    let userFriendlyMsg = '';

    const providerName = provider === 'groq' ? 'Groq' : provider === 'huggingface' ? 'Hugging Face router' : provider.toUpperCase();

    if (apiRes.status === 402) {
      category = 'billing';
      userFriendlyMsg = `${providerName} returned HTTP 402 (Credits exhausted / payment required): ${sanitizedMsg || 'You have no remaining credits or free quota.'}`;
    } else if (apiRes.status === 401) {
      category = 'authentication';
      userFriendlyMsg = `${providerName} returned HTTP 401 (Authentication failed): ${sanitizedMsg || (provider === 'groq' ? 'Invalid GROQ_API_KEY. Verify your key in server .env or Settings.' : 'Please verify your API key/token.')}`;
    } else if (apiRes.status === 403) {
      category = 'permission';
      userFriendlyMsg = `${providerName} returned HTTP 403 (Access denied): ${sanitizedMsg || 'Verify model permissions or token scope.'}`;
    } else if (apiRes.status === 429) {
      category = 'rate_limit';
      userFriendlyMsg = `${providerName} returned HTTP 429 (Rate limit exceeded): ${sanitizedMsg || 'Rate limit reached. Please wait a moment before retrying.'}`;
    } else if (apiRes.status >= 500) {
      category = 'provider_down';
      userFriendlyMsg = `${providerName} returned HTTP ${apiRes.status}: ${sanitizedMsg || 'The upstream inference provider is temporarily down or overloaded.'}`;
    } else if (apiRes.status === 404) {
      category = 'bad_request';
      const recModel = provider === 'groq' ? 'openai/gpt-oss-20b' : 'google/gemma-3-12b-it';
      userFriendlyMsg = `${providerName} returned HTTP 404: Model '${model}' was not found or has been deprecated. Please verify your model ID in Settings (recommended: ${recModel}). Upstream message: ${sanitizedMsg}`;
    } else {
      category = 'bad_request';
      userFriendlyMsg = `${providerName} (${model}) returned HTTP ${apiRes.status}: ${sanitizedMsg}`;
    }

    throw new GemmaProviderError(
      userFriendlyMsg,
      apiRes.status,
      category,
      provider,
      model,
      sanitizedMsg
    );
  }

  const data = await apiRes.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    content?: string;
  };

  const responseText = data.choices?.[0]?.message?.content || data.content || '';
  if (!responseText) {
    throw new GemmaProviderError(`Empty response received from Gemma inference endpoint (${model})`, 502, 'provider_down', provider, model);
  }

  return {
    success: true,
    provider,
    model,
    endpoint: apiUrl,
    openModel: provider === 'groq' ? `GPT OSS (${model}) via Groq Cloud` : `Google Gemma (${model})`,
    text: responseText,
    timestamp: new Date().toISOString()
  };
}

export function resolveEndpoint(endpoint: string): string {
  const clean = endpoint.trim().replace(/\/+$/, '');
  if (clean.endsWith('/chat/completions')) {
    return clean;
  }
  return `${clean}/chat/completions`;
}

export function getEnvProvider(): 'groq' | 'huggingface' | 'openrouter' | 'ollama' | 'custom' {
  const p = (process.env.AI_PROVIDER || process.env.GEMMA_PROVIDER || DEFAULT_GEMMA_PROVIDER).toLowerCase();
  if (p === 'groq' || p === 'huggingface' || p === 'openrouter' || p === 'ollama' || p === 'custom') {
    return p;
  }
  return 'huggingface';
}

export function getEnvApiKey(provider: string): string | undefined {
  if (provider === 'groq') {
    return process.env.GROQ_API_KEY;
  }
  if (provider === 'huggingface') {
    return (
      process.env.HF_TOKEN ||
      process.env.HUGGINGFACE_API_KEY ||
      process.env.GEMMA_API_KEY
    );
  }
  if (provider === 'openrouter') {
    return process.env.OPENROUTER_API_KEY || process.env.GEMMA_API_KEY;
  }
  return process.env.GEMMA_API_KEY;
}

export function getEnvEndpoint(provider: string): string {
  if (provider === 'groq') return process.env.GROQ_ENDPOINT || DEFAULT_GROQ_ENDPOINT;
  if (process.env.GEMMA_ENDPOINT) return process.env.GEMMA_ENDPOINT;
  if (provider === 'huggingface') return DEFAULT_HF_ROUTER_ENDPOINT;
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1';
  if (provider === 'ollama') {
    return process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }
  return DEFAULT_HF_ROUTER_ENDPOINT;
}

export function getEnvModel(provider: string): string {
  if (provider === 'groq') return process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  if (process.env.GEMMA_MODEL) return process.env.GEMMA_MODEL;
  if (provider === 'huggingface') return DEFAULT_GEMMA_MODEL;
  if (provider === 'openrouter') return DEFAULT_GEMMA_MODEL;
  if (provider === 'ollama') return 'gemma2:9b';
  return DEFAULT_GEMMA_MODEL;
}

export function sanitizeSecret(text: unknown): string {
  if (text === null || text === undefined) return '';
  let str = String(text);

  // Redact any active runtime environment secrets first
  const activeSecrets = [
    process.env.GROQ_API_KEY,
    process.env.HF_TOKEN,
    process.env.HUGGINGFACE_API_KEY,
    process.env.OPENROUTER_API_KEY,
    process.env.GEMMA_API_KEY,
    process.env.GEMINI_API_KEY
  ].filter((s): s is string => typeof s === 'string' && s.trim().length > 4);

  for (const secret of activeSecrets) {
    if (str.includes(secret)) {
      str = str.split(secret).join('[REDACTED]');
    }
  }

  // Redact URL user credentials (e.g. https://user:pass@domain)
  str = str.replace(/:\/\/([^:@]+):([^@]+)@/g, '://[REDACTED]:[REDACTED]@');

  // Redact Bearer tokens
  str = str.replace(/Bearer\s+([A-Za-z0-9_\-.]+)/gi, 'Bearer [REDACTED]');

  // Redact Groq API keys (gsk_...)
  str = str.replace(/gsk_[a-zA-Z0-9_-]+/g, 'gsk_***');

  // Redact Hugging Face tokens (hf_...)
  str = str.replace(/hf_[a-zA-Z0-9_-]+/g, 'hf_***');

  // Redact OpenAI / OpenRouter / Anthropic style keys (sk-...)
  str = str.replace(/sk-[a-zA-Z0-9_\-.]{8,}/g, 'sk-***');

  // Redact query parameter or header tokens (e.g. ?token=..., &key=...)
  str = str.replace(/([?&](?:token|key|api_key|apiKey)=)[^&\s]+/gi, '$1[REDACTED]');

  return str;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleGemmaRequest(req, res);
}
