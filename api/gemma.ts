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
  provider?: 'huggingface' | 'openrouter' | 'ollama' | 'custom';
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

export async function handleGemmaRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Ensure CORS and JSON headers are always set
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    // Handle health check on GET /api/gemma
    if (req.method === 'GET') {
      try {
        const health = await checkHealth();
        res.statusCode = health.statusCode && health.status === 'error' ? health.statusCode : 200;
        res.end(JSON.stringify(health));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.statusCode = 200;
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

    // Read request body (handles both Vercel pre-parsed req.body and raw Node stream)
    let body: GemmaRequestBody = {};
    const reqWithBody = req as { body?: unknown };
    if (reqWithBody.body !== undefined && reqWithBody.body !== null) {
      if (typeof reqWithBody.body === 'object') {
        body = reqWithBody.body as GemmaRequestBody;
      } else if (typeof reqWithBody.body === 'string') {
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
      try {
        for await (const chunk of req) {
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

  if (provider === 'huggingface') {
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

    if (apiRes.status === 402) {
      category = 'billing';
      userFriendlyMsg = `Hugging Face router returned HTTP 402: ${sanitizedMsg || 'You have no remaining credits. Purchase pre-paid credits to continue using Inference Providers. Alternatively, subscribe to PRO to get monthly included credits.'}`;
    } else if (apiRes.status === 401) {
      category = 'authentication';
      userFriendlyMsg = `Hugging Face router returned HTTP 401: ${sanitizedMsg || 'Authentication failed. Please verify your HF_TOKEN.'}`;
    } else if (apiRes.status === 403) {
      category = 'permission';
      userFriendlyMsg = `Hugging Face router returned HTTP 403: ${sanitizedMsg || 'Access denied. Verify model permissions or token scope.'}`;
    } else if (apiRes.status === 429) {
      category = 'rate_limit';
      userFriendlyMsg = `Hugging Face router returned HTTP 429 (Rate limit exceeded): ${sanitizedMsg || 'Please wait a moment before retrying.'}`;
    } else if (apiRes.status >= 500) {
      category = 'provider_down';
      userFriendlyMsg = `Hugging Face router returned HTTP ${apiRes.status}: ${sanitizedMsg || 'The upstream inference provider is temporarily down or overloaded.'}`;
    } else {
      category = 'bad_request';
      userFriendlyMsg = `${provider.toUpperCase()} (${model}) returned HTTP ${apiRes.status}: ${sanitizedMsg}`;
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
    openModel: `Google Gemma (${model})`,
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

export function getEnvProvider(): 'huggingface' | 'openrouter' | 'ollama' | 'custom' {
  const p = (process.env.GEMMA_PROVIDER || DEFAULT_GEMMA_PROVIDER).toLowerCase();
  if (p === 'huggingface' || p === 'openrouter' || p === 'ollama' || p === 'custom') {
    return p;
  }
  return 'huggingface';
}

export function getEnvApiKey(provider: string): string | undefined {
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
  if (process.env.GEMMA_ENDPOINT) return process.env.GEMMA_ENDPOINT;
  if (provider === 'huggingface') return DEFAULT_HF_ROUTER_ENDPOINT;
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1';
  if (provider === 'ollama') {
    return process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }
  return DEFAULT_HF_ROUTER_ENDPOINT;
}

export function getEnvModel(provider: string): string {
  if (process.env.GEMMA_MODEL) return process.env.GEMMA_MODEL;
  if (provider === 'huggingface') return DEFAULT_GEMMA_MODEL;
  if (provider === 'openrouter') return DEFAULT_GEMMA_MODEL;
  if (provider === 'ollama') return 'gemma2:9b';
  return DEFAULT_GEMMA_MODEL;
}

export function sanitizeSecret(text: unknown): string {
  if (text === null || text === undefined) return '';
  let str = String(text);

  // Redact Bearer tokens
  str = str.replace(/Bearer\s+([A-Za-z0-9_\-.]+)/gi, 'Bearer [REDACTED]');

  // Redact Hugging Face tokens (hf_...)
  str = str.replace(/hf_[a-zA-Z0-9_-]+/g, 'hf_***');

  // Redact OpenAI / OpenRouter / Anthropic style keys (sk-...)
  str = str.replace(/sk-[a-zA-Z0-9_\-.]{8,}/g, 'sk-***');

  // Redact query parameter or header tokens (e.g. ?token=..., &key=...)
  str = str.replace(/([?&](?:token|key|api_key|apiKey)=)[^&\s]+/gi, '$1[REDACTED]');

  // Redact any actual runtime environment secrets if present
  const activeSecrets = [
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

  return str;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleGemmaRequest(req, res);
}
