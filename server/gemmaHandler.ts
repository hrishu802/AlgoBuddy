// server/gemmaHandler.ts
// Re-exports the unified handler from api/gemma.ts for local Vite dev server and test compatibility.
export {
  handleGemmaRequest,
  checkHealth,
  executeGemmaInference,
  DEFAULT_GEMMA_PROVIDER,
  DEFAULT_GEMMA_MODEL,
  DEFAULT_HF_ROUTER_ENDPOINT,
  DEFAULT_GROQ_MODEL,
  DEFAULT_GROQ_ENDPOINT,
  GemmaProviderError,
  sanitizeSecret,
  validateGemmaPayload,
  checkRateLimit,
  resetRateLimits,
  getClientIp,
  resolveCorsOrigin,
  getGatewayDiagnostics,
  MAX_BODY_BYTES,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_RATE_LIMIT_MAX
} from '../api/gemma.ts';
export type {
  GemmaRequestBody,
  ChatMessagePayload,
  GemmaErrorCategory,
  GemmaHealthResponse,
  ValidationSuccess,
  ValidationError,
  PayloadValidationResult
} from '../api/gemma.ts';
