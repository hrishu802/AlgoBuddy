# AlgoBuddy — Your DSA Problem-Solving Mentor

> **Hacktoberfest 2026 "Build for a Friend" Challenge**  
> *"Don't just give me the solution. Help me learn how to find it."*  
> **Core Philosophy:** *"Think first. Hint second. Solution last."*

AlgoBuddy is an open-source, AI-powered Data Structures and Algorithms (DSA) mentor tailored for software engineering interview preparation. Rather than acting like a generic chatbot that dumps solutions immediately and undermines learning, AlgoBuddy guides candidates Socratically through constraint analysis, brute-force reasoning, pattern recognition, and progressive hinting.

---

## 🤖 Powered by Google Gemma (Hosted Open-Weight Model)

AlgoBuddy is built with open-source AI at its foundation, powered primarily by **Google's Gemma 3 12B Instruct** open-weight model (`google/gemma-3-12b-it`) hosted on **Hugging Face Inference Providers**.

### Why Hosted Open-Weight Gemma via Hugging Face?
1. **Lightweight & High-Performance**: Running 9B+ or 12B+ parameter models locally via Ollama on consumer machines (such as Apple M3 Macs) creates heavy unified memory contention, thermal throttling, and system lag. Hosted inference via **Hugging Face Inference Providers** offloads inference to high-throughput cloud infrastructure while preserving full access to Google's open weights.
2. **Accessible to Every Learner**: Anyone with a free Hugging Face account can obtain a personal user token (`hf_...`) at zero cost, without platform lock-in or proprietary vendor API subscriptions.
3. **Dedicated Socratic Pedagogical Conditioning**: Open-weight architectures allow custom system prompts and reasoning scaffolds to enforce *"Think first. Hint second. Solution last."* without arbitrary closed-model censorship or unpredictable refusal triggers on technical code.
4. **Hacktoberfest 2026 Compliance**: Fulfills the open-source and open-model challenge requirements by prioritizing open-weight AI over closed proprietary models.

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

### 2. Configure Gemma Open Model Credentials

AlgoBuddy connects to real **Google Gemma 3 12B Instruct** via Hugging Face Inference Providers.

1. Obtain a free Hugging Face Access Token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Set your token:
   ```env
   GEMMA_PROVIDER=huggingface
   GEMMA_MODEL=google/gemma-3-12b-it
   GEMMA_ENDPOINT=https://router.huggingface.co/v1
   HF_TOKEN=hf_your_huggingface_token_here
   ```
   *(Note: You can also enter your token directly in the in-app Settings modal ⚙️ — it is processed strictly by the server-side proxy `/api/gemma` and never bundled into client assets!)*

#### Development Fallback: Socratic Mock
If you are developing offline or without an API key, switch the AI Engine in Settings to **Socratic Mock (Dev Fallback)** to explore the full pedagogical interface deterministically.

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
