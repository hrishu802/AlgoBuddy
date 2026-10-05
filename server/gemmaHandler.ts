// server/gemmaHandler.ts
// Re-exports the unified Gemma handler from api/gemma.ts for local Vite dev server compatibility.
export {
  handleGemmaRequest,
  checkHealth,
  executeGemmaInference,
  DEFAULT_GEMMA_PROVIDER,
  DEFAULT_GEMMA_MODEL,
  DEFAULT_HF_ROUTER_ENDPOINT
} from '../api/gemma.ts';
export type { GemmaRequestBody, ChatMessagePayload } from '../api/gemma.ts';
