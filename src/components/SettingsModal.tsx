import React, { useState, useEffect } from 'react';
import { AISettings, AIProvider, GemmaBackendProvider } from '../types';
import { 
  X, 
  Cpu, 
  Key, 
  ShieldCheck, 
  Sliders, 
  RotateCcw, 
  Sparkles, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Terminal
} from 'lucide-react';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSaveSettings: (settings: AISettings) => void;
  onResetStats: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetStats,
}) => {
  const [provider, setProvider] = useState<AIProvider>(settings.provider || 'groq');
  const [gemmaProvider, setGemmaProvider] = useState<GemmaBackendProvider>(settings.gemmaProvider || 'huggingface');
  const [gemmaModel, setGemmaModel] = useState(settings.gemmaModel || 'google/gemma-3-12b-it');
  const [gemmaApiKey, setGemmaApiKey] = useState(settings.gemmaApiKey || '');
  const [gemmaEndpoint, setGemmaEndpoint] = useState(settings.gemmaEndpoint || 'https://router.huggingface.co/v1');

  const [groqApiKey, setGroqApiKey] = useState(settings.groqApiKey || '');
  const [groqModel, setGroqModel] = useState(settings.groqModel || 'llama-3.3-70b-versatile');
  const [groqEndpoint, setGroqEndpoint] = useState(settings.groqEndpoint || 'https://api.groq.com/openai/v1');
  
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [geminiModel, setGeminiModel] = useState(settings.model || 'gemini-1.5-flash');
  const [strictness, setStrictness] = useState(settings.mentorStrictness || 'strict');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Health / Connection test state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    status: 'idle' | 'success' | 'warning' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  useEffect(() => {
    if (isOpen) {
      setProvider(settings.provider || 'groq');
      setGemmaProvider(settings.gemmaProvider || 'huggingface');
      setGemmaModel(settings.gemmaModel || (settings.gemmaProvider === 'ollama' ? 'gemma2:9b' : 'google/gemma-3-12b-it'));
      setGemmaApiKey(settings.gemmaApiKey || '');
      setGemmaEndpoint(settings.gemmaEndpoint || 'https://router.huggingface.co/v1');
      setGroqApiKey(settings.groqApiKey || '');
      setGroqModel(settings.groqModel || 'llama-3.3-70b-versatile');
      setGroqEndpoint(settings.groqEndpoint || 'https://api.groq.com/openai/v1');
      setGeminiApiKey(settings.geminiApiKey || '');
      setGeminiModel(settings.model || 'gemini-1.5-flash');
      setStrictness(settings.mentorStrictness || 'strict');
      setConnectionStatus({ status: 'idle', message: '' });
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus({ status: 'idle', message: 'Testing backend connection...' });

    const activeProvider = provider === 'groq' ? 'groq' : gemmaProvider;
    const activeModel = provider === 'groq' ? groqModel : gemmaModel;
    const activeKey = provider === 'groq' ? groqApiKey : gemmaApiKey;
    const activeEndpoint = provider === 'groq' ? groqEndpoint : gemmaEndpoint;

    try {
      const res = await fetch('/api/gemma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'health',
          provider: activeProvider,
          model: activeModel,
          apiKey: activeKey.trim() || undefined,
          endpoint: activeEndpoint.trim() || undefined
        })
      });

      let data: {
        status?: string;
        message?: string;
        openModelName?: string;
        statusCode?: number;
        errorCategory?: string;
        error?: string;
      } = {};

      try {
        data = await res.json();
      } catch {
        // non-JSON response
      }

      if (data.status === 'configured' || data.status === 'connected') {
        setConnectionStatus({
          status: 'success',
          message: data.message || `Connected to ${data.openModelName || 'Inference Backend'}`
        });
      } else if (res.status === 402 || data.statusCode === 402 || data.errorCategory === 'billing') {
        setConnectionStatus({
          status: 'error',
          message: data.message || data.error || 'Provider credits exhausted (HTTP 402).'
        });
      } else if (data.status === 'unconfigured' || res.status === 401) {
        setConnectionStatus({
          status: 'warning',
          message: data.message || data.error || (provider === 'groq' ? 'Groq API Key required. Configure GROQ_API_KEY or enter your key.' : 'Authentication token required.')
        });
      } else if (!res.ok) {
        setConnectionStatus({
          status: 'error',
          message: data.message || data.error || `Server returned HTTP ${res.status}`
        });
      } else {
        setConnectionStatus({
          status: 'warning',
          message: data.message || 'Server reachable, but provider requires configuration or key.'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConnectionStatus({
        status: 'error',
        message: `Connection failed: ${msg}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      provider,
      gemmaProvider,
      gemmaModel,
      gemmaApiKey: gemmaApiKey.trim() || undefined,
      gemmaEndpoint: gemmaEndpoint.trim() || undefined,
      groqApiKey: groqApiKey.trim() || undefined,
      groqModel,
      groqEndpoint: groqEndpoint.trim() || undefined,
      geminiApiKey: geminiApiKey.trim() || undefined,
      model: geminiModel,
      mentorStrictness: strictness
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-100">
                  AlgoBuddy AI & Mentor Settings
                </h3>
                <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Open Model Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Google Gemma open-weight mentor & Socratic fallback
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          
          {/* AI Engine Selection */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
              <span>Primary AI Mentor Engine</span>
              <span className="text-[10px] text-indigo-400 font-normal">
                Socratic DSA Mentor • ₹0 Budget
              </span>
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Option 1: Groq Cloud (Free Tier) - PRIMARY */}
              <button
                type="button"
                onClick={() => setProvider('groq')}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  provider === 'groq'
                    ? 'bg-gradient-to-br from-orange-950/60 to-amber-950/40 border-orange-500 text-orange-200 ring-2 ring-orange-500/60'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="font-semibold text-xs flex items-center gap-1.5 mb-1 text-slate-100">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span>Groq (Hosted Free Tier)</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Meta Llama 3.3 70B Versatile on official Groq free tier. Strict ₹0 budget.
                </div>
              </button>

              {/* Option 2: Gemma (Hosted Open Model) */}
              <button
                type="button"
                onClick={() => setProvider('gemma')}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  provider === 'gemma'
                    ? 'bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border-indigo-500 text-indigo-200 ring-2 ring-indigo-500/60'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs flex items-center gap-1.5 mb-1 text-slate-100">
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Gemma (HF Open Weights)</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Google Gemma 3 12B Instruct via Hugging Face Inference Providers.
                </div>
              </button>

              {/* Option 3: Socratic Mock - Offline Fallback */}
              <button
                type="button"
                onClick={() => setProvider('mock')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'mock'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 ring-2 ring-indigo-500/60'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs flex items-center gap-1.5 mb-1 text-slate-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Socratic Mock (Dev Fallback)</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Zero setup, offline development fallback using deterministic heuristics.
                </div>
              </button>

              {/* Option 4: Gemini - Proprietary Cloud */}
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  provider === 'gemini'
                    ? 'bg-slate-800/80 border-slate-600 text-slate-200 ring-1 ring-slate-500'
                    : 'bg-slate-900/60 border-slate-800/60 text-slate-500 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs flex items-center gap-1.5 mb-1 text-slate-300">
                  <Cpu className="w-3.5 h-3.5 text-slate-400" />
                  <span>Gemini (Cloud)</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  Proprietary cloud API alternative.
                </div>
              </button>
            </div>
          </div>

          {/* Groq Cloud Configuration */}
          {provider === 'groq' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/80 border border-orange-500/30">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Server className="w-3.5 h-3.5 text-orange-400" />
                  Groq Hosted Cloud AI (Free Tier)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Strict ₹0 Budget • Free Tier
                </span>
              </div>

              {/* Model selection */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Model Selection (Verified Free Tier)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGroqModel('llama-3.3-70b-versatile')}
                    className={`p-2 rounded-lg border text-left text-[11px] transition-colors ${
                      groqModel === 'llama-3.3-70b-versatile'
                        ? 'bg-orange-600/30 text-orange-200 border-orange-500 font-semibold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">Llama 3.3 70B Versatile</div>
                    <div className="text-[9px] text-slate-400">Recommended for DSA reasoning (128k context)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroqModel('llama-3.1-8b-instant')}
                    className={`p-2 rounded-lg border text-left text-[11px] transition-colors ${
                      groqModel === 'llama-3.1-8b-instant'
                        ? 'bg-orange-600/30 text-orange-200 border-orange-500 font-semibold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">Llama 3.1 8B Instant</div>
                    <div className="text-[9px] text-slate-400">Ultra-low latency (128k context)</div>
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                  <span>Groq API Key (GROQ_API_KEY)</span>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-orange-400 hover:underline"
                  >
                    Get free key →
                  </a>
                </label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="password"
                    placeholder="gsk_... (Or configure in server .env)"
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-100 font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Server-side only. Never bundled or leaked to client JS. Free tier: 30 requests/min.
                </p>
              </div>

              {/* Test Connection Button & Status */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-[11px] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>Test Groq Connection</span>
                </button>

                {connectionStatus.message && (
                  <div className={`text-[10px] flex items-center gap-1 max-w-[280px] leading-tight ${
                    connectionStatus.status === 'success'
                      ? 'text-emerald-400'
                      : connectionStatus.status === 'warning'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}>
                    {connectionStatus.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{connectionStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gemma Open Model Configuration */}
          {provider === 'gemma' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/30">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  Gemma Hosted Inference Backend
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Server-side proxy (/api/gemma)
                </span>
              </div>

              {/* Backend Provider Selector */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Inference Host / Runner
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setGemmaProvider('groq');
                      setGemmaModel('llama-3.3-70b-versatile');
                      setGemmaEndpoint('https://api.groq.com/openai/v1');
                    }}
                    className={`p-1.5 rounded-lg border text-center text-[11px] transition-colors ${
                      gemmaProvider === 'groq'
                        ? 'bg-orange-600/30 text-orange-200 border-orange-500 font-semibold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    ⚡ Groq (₹0 Free)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGemmaProvider('huggingface');
                      setGemmaModel('google/gemma-3-12b-it');
                      setGemmaEndpoint('https://router.huggingface.co/v1');
                    }}
                    className={`p-1.5 rounded-lg border text-center text-[11px] transition-colors ${
                      gemmaProvider === 'huggingface'
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 font-semibold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    🤗 Hugging Face
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGemmaProvider('openrouter');
                      setGemmaModel('google/gemma-3-12b-it');
                      setGemmaEndpoint('https://openrouter.ai/api/v1');
                    }}
                    className={`p-1.5 rounded-lg border text-center text-[11px] transition-colors ${
                      gemmaProvider === 'openrouter'
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 font-semibold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    🌐 OpenRouter
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGemmaProvider('custom');
                    }}
                    className={`p-1.5 rounded-lg border text-center text-[11px] transition-colors ${
                      gemmaProvider === 'custom'
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 font-semibold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    ⚡ Custom
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGemmaProvider('ollama');
                      setGemmaModel('gemma2:9b');
                      setGemmaEndpoint('http://localhost:11434');
                    }}
                    className={`p-1.5 rounded-lg border text-center text-[11px] transition-colors ${
                      gemmaProvider === 'ollama'
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 font-semibold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    🦙 Ollama
                  </button>
                </div>
              </div>

              {/* Model identifier */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                  <span>Open Model Identifier</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {gemmaProvider === 'huggingface' ? 'google/gemma-3-12b-it' : ''}
                  </span>
                </label>
                <input
                  type="text"
                  value={gemmaModel}
                  onChange={(e) => setGemmaModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  placeholder="google/gemma-3-12b-it"
                />
              </div>

              {/* Endpoint for Ollama / Custom */}
              {(gemmaProvider === 'ollama' || gemmaProvider === 'custom') && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {gemmaProvider === 'ollama' ? 'Local Ollama Endpoint' : 'Custom Base URL'}
                  </label>
                  <div className="relative">
                    <Terminal className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={gemmaEndpoint}
                      onChange={(e) => setGemmaEndpoint(e.target.value)}
                      placeholder={gemmaProvider === 'ollama' ? 'http://localhost:11434' : 'https://...'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {gemmaProvider === 'ollama' && (
                    <p className="text-[10px] text-amber-400/90 mt-1">
                      ⚠️ Note: Running 9B+ local models on Apple Silicon may cause high RAM pressure. Hosted inference via Hugging Face is the recommended primary method.
                    </p>
                  )}
                </div>
              )}

              {/* API Key for Cloud Hosts */}
              {gemmaProvider !== 'ollama' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                    <span>
                      {gemmaProvider === 'huggingface'
                        ? 'Hugging Face Access Token (HF_TOKEN)'
                        : `${gemmaProvider.toUpperCase()} API Key`}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (Or configure in server .env)
                    </span>
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="password"
                      placeholder={gemmaProvider === 'huggingface' ? 'hf_...' : `API key for ${gemmaProvider}`}
                      value={gemmaApiKey}
                      onChange={(e) => setGemmaApiKey(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-100 font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Kept strictly server-side in the backend proxy layer. Never exposed in Vite frontend bundle.
                  </p>
                </div>
              )}


              {/* Test Connection Button & Status */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-[11px] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>Test Backend Connection</span>
                </button>

                {connectionStatus.message && (
                  <div className={`text-[10px] flex items-center gap-1 max-w-[280px] leading-tight ${
                    connectionStatus.status === 'success' 
                      ? 'text-emerald-400' 
                      : connectionStatus.status === 'warning'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}>
                    {connectionStatus.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{connectionStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gemini Specific Config (Legacy / Secondary) */}
          {provider === 'gemini' && (
            <div className="space-y-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-100 font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Gemini Model
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
                </select>
              </div>
            </div>
          )}

          {/* Socratic Mock Explainer */}
          {provider === 'mock' && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-200">Socratic Mock Engine Active:</span>
              <p className="mt-1">
                Runs completely client-side with zero external API calls or network latency. Pre-programmed with authentic DSA problem-solving heuristics and progressive guidance tiers.
              </p>
            </div>
          )}

          {/* Teaching Philosophy / Strictness */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Mentor Strictness
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['strict', 'balanced', 'exploratory'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrictness(s)}
                  className={`py-1.5 px-2 rounded-lg border text-center capitalize transition-colors text-[11px] ${
                    strictness === s
                      ? 'bg-indigo-600 text-white border-indigo-500 font-medium'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {strictness === 'strict'
                ? 'Strict Socratic: Never gives code until constraints, brute force & invariants are derived.'
                : strictness === 'balanced'
                ? 'Balanced: Encourages self-reflection with progressive nudges.'
                : 'Exploratory: Flexible dialogue with faster code hints.'}
            </p>
          </div>

          {/* Reset Stats section */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Local Progress Data:</span>
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Stats</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetStats();
                    setShowResetConfirm(false);
                  }}
                  className="text-[10px] bg-rose-600/30 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm transition-colors"
            >
              Save Preferences
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
