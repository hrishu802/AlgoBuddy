import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleGemmaRequest } from './server/gemmaHandler.ts'

function gemmaApiPlugin(): Plugin {
  return {
    name: 'gemma-api-backend-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url === '/api/gemma' || req.url.startsWith('/api/gemma/') || req.url.startsWith('/api/gemma?'))) {
          await handleGemmaRequest(req, res);
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url === '/api/gemma' || req.url.startsWith('/api/gemma/') || req.url.startsWith('/api/gemma?'))) {
          await handleGemmaRequest(req, res);
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Populate server-side environment variables safely in process.env
  // These variables are NEVER given the VITE_ prefix to guarantee they are never bundled into client JS
  const serverKeys = [
    'HF_TOKEN',
    'HUGGINGFACE_API_KEY',
    'GEMMA_PROVIDER',
    'GEMMA_MODEL',
    'GEMMA_ENDPOINT',
    'OPENROUTER_API_KEY'
  ];
  for (const key of serverKeys) {
    if (env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      gemmaApiPlugin(),
    ],
  };
});

