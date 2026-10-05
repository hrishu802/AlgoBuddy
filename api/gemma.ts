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
        res.statusCode = 200;
        res.end(JSON.stringify(health));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.statusCode = 200;
        res.end(JSON.stringify({
          status: 'error',
          provider: getEnvProvider(),
          model: getEnvModel(getEnvProvider()),
          message: `Health check error: ${sanitizeSecret(msg)}`
        }));
      }
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));
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
          res.end(JSON.stringify({ success: false, error: 'Malformed JSON payload' }));
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
        res.end(JSON.stringify({ success: false, error: `Failed to read request body: ${msg}` }));
        return;
      }

      try {
        body = bodyStr ? JSON.parse(bodyStr) : {};
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Malformed JSON payload' }));
        return;
      }
    }

    if (body.action === 'health') {
      const health = await checkHealth(body);
      res.statusCode = 200;
      res.end(JSON.stringify(health));
      return;
    }

    try {
      const result = await executeGemmaInference(body);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Return HTTP 400 with sanitized configuration or provider error.
      // NEVER silently fall back to MockAI.
      res.statusCode = 400;
      res.end(JSON.stringify({
        success: false,
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
      error: `Server handler error: ${sanitizeSecret(fatalMsg)}`,
      provider: getEnvProvider(),
      model: getEnvModel(getEnvProvider())
    }));
  }
}

export async function checkHealth(body?: GemmaRequestBody) {
  const provider = body?.provider || getEnvProvider();
  const apiKey = body?.apiKey || getEnvApiKey(provider);
  const endpoint = body?.endpoint || getEnvEndpoint(provider);
  const model = body?.model || getEnvModel(provider);

  if (provider === 'huggingface') {
    if (!apiKey) {
      return {
        status: 'unconfigured',
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
          provider: 'huggingface',
          model,
          endpoint: chatUrl,
          openModelName: 'Google Gemma 3 12B Instruct (Hosted Open Weights)',
          message: 'Hugging Face authentication failed (401 Unauthorized). Please check your HF token in .env or Settings.'
        };
      }

      if (!testRes.ok) {
        const errText = await testRes.text().catch(() => '');
        let errMsg = errText.slice(0, 200);
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error?.message || parsed.error || errMsg;
        } catch {
          // not JSON
        }
        return {
          status: 'error',
          provider: 'huggingface',
          model,
          endpoint: chatUrl,
          openModelName: 'Google Gemma 3 12B Instruct (Hosted Open Weights)',
          message: `Hugging Face router returned HTTP ${testRes.status}: ${sanitizeSecret(errMsg)}`
        };
      }

      return {
        status: 'connected',
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
        provider: 'openrouter',
        model,
        endpoint: resolveEndpoint(endpoint),
        openModelName: `Google Gemma (${model}) via OpenRouter`,
        message: 'OpenRouter API Key is required. Set OPENROUTER_API_KEY in .env or Settings.'
      };
    }
    return {
      status: 'configured',
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
      provider,
      model,
      endpoint: resolveEndpoint(endpoint),
      openModelName: `Google Gemma (${model})`,
      message: `No API key found for ${provider.toUpperCase()}. Set credentials in .env or Settings.`
    };
  }

  return {
    status: 'configured',
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
    throw new Error('No prompt or messages provided for inference');
  }

  let apiUrl = '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (provider === 'huggingface') {
    if (!apiKey) {
      throw new Error(
        'Hugging Face API token is required for hosted Gemma inference. ' +
        'Set HF_TOKEN or HUGGINGFACE_API_KEY in your server .env file, or enter your token in Settings (⚙️).'
      );
    }
    apiUrl = resolveEndpoint(endpoint);
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider === 'openrouter') {
    if (!apiKey) {
      throw new Error('OpenRouter API Key is required. Set OPENROUTER_API_KEY in .env or Settings.');
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
    throw new Error(`Unsupported provider '${provider}'. Supported providers are 'huggingface', 'openrouter', 'ollama', 'custom'.`);
  }

  const payload = {
    model,
    messages,
    temperature: body.temperature ?? 0.3,
    max_tokens: body.maxTokens ?? 1200
  };

  const apiRes = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45000)
  });

  if (!apiRes.ok) {
    const errBody = await apiRes.text().catch(() => '');
    let parsedErrMsg = errBody.slice(0, 300);
    try {
      const errJson = JSON.parse(errBody);
      parsedErrMsg = errJson.error?.message || errJson.error || errJson.message || parsedErrMsg;
    } catch {
      // not JSON
    }
    throw new Error(`${provider.toUpperCase()} (${model}) returned HTTP ${apiRes.status}: ${sanitizeSecret(parsedErrMsg)}`);
  }

  const data = await apiRes.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    content?: string;
  };

  const responseText = data.choices?.[0]?.message?.content || data.content || '';
  if (!responseText) {
    throw new Error(`Empty response received from Gemma inference endpoint (${model})`);
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

function resolveEndpoint(endpoint: string): string {
  const clean = endpoint.trim().replace(/\/+$/, '');
  if (clean.endsWith('/chat/completions')) {
    return clean;
  }
  return `${clean}/chat/completions`;
}

function getEnvProvider(): 'huggingface' | 'openrouter' | 'ollama' | 'custom' {
  const p = (process.env.GEMMA_PROVIDER || DEFAULT_GEMMA_PROVIDER).toLowerCase();
  if (p === 'huggingface' || p === 'openrouter' || p === 'ollama' || p === 'custom') {
    return p;
  }
  return 'huggingface';
}

function getEnvApiKey(provider: string): string | undefined {
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

function getEnvEndpoint(provider: string): string {
  if (process.env.GEMMA_ENDPOINT) return process.env.GEMMA_ENDPOINT;
  if (provider === 'huggingface') return DEFAULT_HF_ROUTER_ENDPOINT;
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1';
  if (provider === 'ollama') {
    return process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }
  return DEFAULT_HF_ROUTER_ENDPOINT;
}

function getEnvModel(provider: string): string {
  if (process.env.GEMMA_MODEL) return process.env.GEMMA_MODEL;
  if (provider === 'huggingface') return DEFAULT_GEMMA_MODEL;
  if (provider === 'openrouter') return DEFAULT_GEMMA_MODEL;
  if (provider === 'ollama') return 'gemma2:9b';
  return DEFAULT_GEMMA_MODEL;
}

function sanitizeSecret(text: string): string {
  return String(text).replace(/hf_[a-zA-Z0-9]+/g, 'hf_***');
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleGemmaRequest(req, res);
}
