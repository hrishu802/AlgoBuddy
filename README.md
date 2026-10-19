# AlgoBuddy — Your DSA Problem-Solving Mentor

> **Hacktoberfest 2026 "Build for a Friend" Challenge**  
> *"Don't just give me the solution. Help me learn how to find it."*  
> **Core Philosophy:** *"Think first. Hint second. Solution last."*

AlgoBuddy is an open-source, AI-powered Data Structures and Algorithms (DSA) mentor tailored for software engineering interview preparation. Rather than acting like a generic chatbot that dumps solutions immediately and undermines learning, AlgoBuddy guides candidates Socratically through constraint analysis, brute-force reasoning, pattern recognition, and progressive hinting.

---

## 🤖 Hosted Open-Weight AI Providers (Groq & Google Gemma)

AlgoBuddy is built with open-source and open-weight AI at its foundation, supporting two primary hosted options with a **strict ₹0 inference budget**:

1. **Groq Cloud (Primary Free Hosted Inference)**:
   - **Model**: OpenAI GPT OSS 20B (`openai/gpt-oss-20b`, 131k context) or OpenAI GPT OSS 120B (`openai/gpt-oss-120b`).
   - **Zero Cost Budget**: Uses Groq's official **Free Tier** (30 RPM, 1,000 RPD, 8,000 TPM) at **₹0 ($0)** without needing a paid subscription or credit card.
   - **Ultra-Fast LPUs**: Groq's Language Processing Units deliver immediate responses for interactive Socratic hints and live code analysis.

2. **Google Gemma 3 (Hosted via Hugging Face Inference Providers)**:
   - **Model**: Google Gemma 3 12B Instruct (`google/gemma-3-12b-it`).
   - **Open Weights**: Full access to Google's open weights hosted on Hugging Face router infrastructure.

3. **Deterministic Socratic Mock (Offline Fallback)**:
   - **Offline Development**: Operates locally with zero credentials, zero network access, and zero inference costs.

---

## 🚀 Key Features & Modes

### 1. 🧩 Problem Mode
- **Structured 7-Step Pedagogical Flow**:
  1. **Constraints Check**: Analyze input scale ($10^4$ vs $10^5$) and identify allowable Big-O targets.
  2. **Brute Force Baseline**: Establish the baseline exhaustive search and compute its time/space bottlenecks.
  3. **Pattern Identification**: Recognize algorithmic archetypes (Two Pointers, Sliding Window, Monotonic Stack, etc.) without spoilers.
  4. **Progressive Hints**: 5 distinct guidance tiers:
     - **Level 1 (Nudge)**: Subtle directional thought starter.
     - **Level 2 (Hint)**: Pattern & data structure pointer.
     - **Level 3 (Strong Hint)**: Invariant & loop condition guidance.
     - **Level 4 (Explain)**: Step-by-step logic breakdown.
     - **Level 5 (Show Solution)**: Protected behind a deliberate confirmation prompt to preserve retention.
  5. **Develop Optimized Approach**: Formulate state transitions and loop invariants.
  6. **Complexity Analysis**: Deep-dive into time, auxiliary space, and output space.
  7. **Reference Solution**: Full commented production-grade code.
- **Problem Library**: Includes high-frequency LeetCode classics (*Two Sum*, *3Sum*, *Longest Substring Without Repeating Characters*, *Valid Parentheses*, *Trapping Rain Water*, *Coin Change*, *Number of Islands*).
- **Custom Problem Input**: Paste *any* LeetCode or interview problem to immediately launch a Socratic mentoring session.

### 2. 📚 Concept Library & Mode
- Complete library of **14 essential DSA topics**:
  - *Arrays*, *Strings*, *Hashing*, *Two Pointers*, *Sliding Window*, *Stack*, *Queue & Deque*, *Linked List*, *Binary Search*, *Trees & BST*, *Graphs*, *Greedy Algorithms*, *Backtracking*, *Dynamic Programming*.
- Each concept details:
  - **What it is**
  - **When to recognize in interview problems** (trigger phrases)
  - **Common patterns & archetypes**
  - **Walkthrough example code**
  - **Common traps & pitfalls**
  - **Complexity trade-offs**
  - **Interactive Practice Checkpoint Quiz** with instant verification.

### 3. ⚡ Code Mode
- Multi-language code editor (Python, JavaScript, C++, Java) with line numbers and syntax styling.
- Pre-loaded sample snippets to quickly inspect quadratic loops, recursive depth, or linear scans.
- **Mentor Code Analysis**:
  - Correctness verification
  - Estimated Time Complexity ($O(N)$, $O(N^2)$, etc.)
  - Estimated Space Complexity
  - Detected Pattern
  - Specific Bottlenecks & where clock cycles are wasted
  - Optimization Opportunities & Progressive Optimization Hints

### 4. 📊 Interview Readiness Dashboard
- Practice KPIs (Problems Practiced, Concepts Reviewed, Current Streak).
- **Diagnostic Weak Areas Matrix**: Flags specific trouble spots (e.g. *Dynamic Programming State Transitions*, *Monotonic Stack Invariants*) with urgency ratings and quick target actions.
- **Hint Reliance Metric**: Tracks whether you are solving problems more independently over time.
- **Timeline of Recently Studied Topics** and personalized **Recommended Next Practice**.

---

## 🛠️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                   AlgoBuddy Frontend UI                     │
│  React 19 + TypeScript + Tailwind CSS v4 + Lucide Icons    │
│    (WorkspacePage, ProblemMode, ConceptMode, CodeMode)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                fetch('/api/gemma', { ... })
                               │
┌──────────────────────────────▼──────────────────────────────┐
│           Lightweight Server-Side Backend Proxy             │
│               (Vite Connect API Middleware)                 │
│   • Keeps HF_TOKEN strictly on the server                   │
│   • Injects AlgoBuddy Socratic Pedagogical System Prompt    │
│   • ZERO client-side API key leakage                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
            ┌────────────────────────────────────┐
            │   Hugging Face Inference Router    │
            │ (https://router.huggingface.co/v1) │
            │      google/gemma-3-12b-it         │
            │   (Hosted Open-Weight Weights)     │
            └────────────────────────────────────┘
```

- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- **Backend API Layer**: Server-side proxy (`/api/gemma`) that communicates with Hugging Face Inference Providers, guaranteeing that tokens are never exposed in the browser bundle.
- **AI Service Abstraction (`AIService`)**:
  - `GemmaAIService`: **Primary production service** communicating with Google Gemma 3 12B Instruct (`google/gemma-3-12b-it`) via Hugging Face Inference Providers. Does not silently fall back to mock when unconfigured; returns explicit configuration errors.
  - `MockAIService`: **Clearly labeled development fallback** providing deterministic Socratic guidance for offline testing without network access or credentials.
  - `GeminiAIService`: Optional secondary cloud provider.

---

## 💻 Getting Started Locally

### Prerequisites
- Node.js 18+ (tested on Node v25)
- npm 9+

### 1. Installation

```bash
git clone https://github.com/hrishu802/AlgoBuddy.git
cd AlgoBuddy
npm install
```

### 2. Configure AI Provider Credentials

AlgoBuddy connects to **Groq Cloud** (free tier with strict ₹0 budget using OpenAI GPT OSS 20B) or **Google Gemma 3 12B Instruct** via Hugging Face.

#### Option A: Groq Cloud (Recommended • Free Tier • ₹0 Budget)
1. Obtain a free Groq API key at [console.groq.com/keys](https://console.groq.com/keys) (no credit card required).
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Set your Groq configuration:
   ```env
   AI_PROVIDER=groq
   GROQ_API_KEY=gsk_your_groq_api_key_here
   GROQ_MODEL=openai/gpt-oss-20b
   ```

#### Option B: Google Gemma via Hugging Face
1. Obtain a free Hugging Face token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
2. In `.env`:
   ```env
   AI_PROVIDER=huggingface
   GEMMA_PROVIDER=huggingface
   GEMMA_MODEL=google/gemma-3-12b-it
   HF_TOKEN=hf_your_token_here
   ```

*(Note: API keys are strictly server-side in `/api/gemma` and are NEVER bundled into client assets or exposed to the browser.)*

#### Development Fallback: Socratic Mock (Offline • No Key)
If you are developing offline or without an API key, switch the AI Engine in Settings to **Socratic Mock (Dev Fallback)** to explore the full pedagogical interface deterministically without network access.

### 3. Start Development Server

```bash
npm run dev
```

Open your browser at:
```
http://127.0.0.1:5173/
```

### 4. Build for Production

```bash
npm run build
npm run preview
```

---

## 🌐 Production Deployment Architecture

AlgoBuddy is designed for seamless, secure production deployment with a split architecture:

1. **Static Frontend Client**: Built with React 19 + TypeScript + Vite into optimized static assets in `dist/`.
2. **Hardened Server-Side Inference Gateway (`/api/gemma`)**: Serverless function (Vercel) or Node middleware that proxies requests to Hugging Face Inference Providers.

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Browser (SPA)                        │
│             React 19 + TypeScript + Vite                    │
│   (Zero tokens in bundle • Strictly client-side UI)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
            POST /api/gemma    │  GET /api/gemma (Diagnostics)
                               │
┌──────────────────────────────▼──────────────────────────────┐
│           Production Hardened API Gateway                   │
│          (/api/gemma • Vercel Serverless / Node)            │
│   • Reads HF_TOKEN strictly server-side                     │
│   • Payload Schema & Size Validation (Max 512 KB, HTTP 413) │
│   • CORS Origin Whitelisting (ALLOWED_ORIGINS)              │
│   • Abuse Protection (Per-client IP rate limiter)           │
│   • Credential & Bearer Redaction (sanitizeSecret)          │
│   • Upstream Error Categorization (HTTP 402 Billing, etc.)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
               Bearer HF_TOKEN │  (Hidden from browser)
                               ▼
            ┌────────────────────────────────────┐
            │   Hugging Face Inference Router    │
            │ (https://router.huggingface.co/v1) │
            │      google/gemma-3-12b-it         │
            └────────────────────────────────────┘
```

### Deploying to Vercel (Recommended Serverless Hosting)

AlgoBuddy includes pre-configured Vercel support via `vercel.json` and the serverless endpoint at `api/gemma.ts`.

#### Step 1: Push Repository & Import to Vercel
1. Push your repository to GitHub.
2. Log into [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your AlgoBuddy repository.

#### Step 2: Configure Build Settings
Vercel automatically detects the Vite framework and applies the settings in `vercel.json`:
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

#### Step 3: Configure Server-Side Environment Variables
In the Vercel project settings under **Settings > Environment Variables**, add:

| Variable Name | Value / Description | Required? |
| :--- | :--- | :--- |
| `AI_PROVIDER` | `groq` or `huggingface` | Optional (default: `groq` if GROQ_API_KEY set) |
| `GROQ_API_KEY` | Your Groq Cloud API Key (`gsk_...`, free from console.groq.com/keys) | **Required for Groq (₹0 Free Tier)** |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Optional (default: `openai/gpt-oss-20b`) |
| `HF_TOKEN` | Your Hugging Face User Access Token (`hf_...`) | Optional (Required if using Hugging Face) |
| `GEMMA_PROVIDER` | `huggingface` | Optional (default: `huggingface`) |
| `GEMMA_MODEL` | `google/gemma-3-12b-it` | Optional (default: `google/gemma-3-12b-it`) |
| `ALLOWED_ORIGINS` | `https://your-production-domain.vercel.app` | Optional (comma-separated origins) |
| `RATE_LIMIT_MAX` | `60` | Optional (max requests/min/IP) |

> 🔒 **Security Guarantee**: Environment variables without the `VITE_` prefix are **never** bundled into the client JavaScript bundle. `GROQ_API_KEY` and `HF_TOKEN` stay strictly within the serverless runtime.

#### Step 4: Deploy
Click **Deploy**. Once finished:
- Static assets are distributed globally via Vercel Edge CDN.
- Client-side SPA routing (`/workspace`, `/concept`, `/code`, `/progress`) is handled cleanly by the rewrite rules in `vercel.json`.
- The inference gateway is live at `https://<your-app>.vercel.app/api/gemma`.

---

### Alternative Production Deployment: Node Hosting / Docker

If deploying to a Node environment (such as Render, Railway, Fly.io, or VPS):

1. Build the production client bundle:
   ```bash
   npm run build
   ```
2. Run the production preview server (which includes the `/api/gemma` middleware):
   ```bash
   npm run preview -- --host 0.0.0.0 --port 3000
   ```
   Set server environment variables (`HF_TOKEN=hf_... PORT=3000`) in your hosting provider's dashboard.

---

### Gateway Security & Abuse Protection Details

- **Token Protection**: `HF_TOKEN` and upstream API keys are read exclusively server-side.
- **Payload Validation**: Payloads are strictly validated (`messages`, `prompt`, `temperature`, `maxTokens`, `provider`, `model`). Oversized payloads exceeding 512 KB are rejected with `HTTP 413 (Payload Too Large)`.
- **Per-Instance Rate Limiting**: An in-memory sliding-window limiter enforces a default limit of 60 requests/minute per client IP (returning `HTTP 429` with `Retry-After` and `X-RateLimit-*` headers).
  - *Note on Serverless*: In-memory rate limiting protects individual container instances against rapid automated bursts. For globally synchronized multi-instance rate limiting, edge WAF (Vercel Firewall / Cloudflare) is recommended.
- **Secret Redaction**: Any bearer tokens, Hugging Face `hf_` patterns, `sk-` keys, and configured environment secrets are systematically redacted from error bodies, logs, and stack traces.
- **Honest Billing Status**: When upstream Hugging Face inference credits are exhausted, the gateway preserves `HTTP 402` and categorizes the error as `billing`, guiding the user to Hugging Face billing settings without fabricating responses.
- **Safe Diagnostic Endpoint**: `GET /api/gemma` provides gateway readiness diagnostics without consuming upstream inference credits. Active connectivity tests can be performed on demand with `GET /api/gemma?upstream=true` or via the in-app Settings modal.

---

## ⚙️ AI Settings & In-App Configuration

Click the **CPU / Settings icon** in the top navigation bar to configure:
- **Primary AI Engine**: **Gemma (Hosted Open Model)** is selected by default.
- **Inference Host**: Choose between **Hugging Face (Primary)**, **OpenRouter**, **Custom Endpoint**, or **Ollama (Local)**.
- **Test Connection**: Click **"Test Backend Connection"** to verify real-time connectivity to the Hugging Face router.
- **Mentor Strictness**:
  - `Strict`: Derives constraints and brute force before discussing optimal invariants.
  - `Balanced`: Encourages reflection with progressive nudges.
  - `Exploratory`: Flexible dialogue with faster code examples.

---

## 🏆 Hacktoberfest 2026 Submission Details
- **Project**: AlgoBuddy — Your DSA Problem-Solving Mentor
- **Track**: Build for a Friend (Self-Mentor for Software Engineering Interview Preparation)
- **Open AI Implementation**: Google Gemma 3 12B Instruct (`google/gemma-3-12b-it`) via Hugging Face Inference Providers
- **License**: MIT
