import { 
  Problem, 
  Concept, 
  HintLevel, 
  PedagogyStage, 
  ChatMessage, 
  CodeAnalysis,
  AISettings 
} from '../../types';
import { 
  ALGOBUDDY_SYSTEM_PROMPT,
  buildProblemStagePrompt,
  buildConceptExplanationPrompt,
  buildCodeAnalysisPrompt
} from './pedagogicalPrompt';

export interface AIService {
  startProblemSession(problem: Problem): Promise<ChatMessage>;
  askProblemQuestion(
    problem: Problem, 
    stage: PedagogyStage, 
    userMessage: string, 
    history: ChatMessage[]
  ): Promise<ChatMessage>;
  requestHint(
    problem: Problem, 
    level: HintLevel, 
    currentStage: PedagogyStage
  ): Promise<ChatMessage>;
  advancePedagogyStage(
    problem: Problem, 
    targetStage: PedagogyStage
  ): Promise<ChatMessage>;
  explainConcept(
    concept: Concept, 
    query?: string
  ): Promise<ChatMessage>;
  analyzeCode(
    code: string, 
    language: string, 
    problemContext?: string
  ): Promise<CodeAnalysis>;
  askCodeQuestion(
    code: string, 
    analysis: CodeAnalysis, 
    userMessage: string, 
    history: ChatMessage[]
  ): Promise<ChatMessage>;
}

// ==========================================
// REALISTIC SOCRATIC MOCK AI MENTOR
// ==========================================
export class MockAIService implements AIService {
  async startProblemSession(problem: Problem): Promise<ChatMessage> {
    await this.delay(350);
    return {
      id: `msg-${Date.now()}`,
      sender: 'mentor',
      stage: 'constraints',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: `Welcome to **${problem.title}**! Let's follow our interview-ready rhythm:\n\n` +
        `**"Think first. Hint second. Solution last."**\n\n` +
        `*(Socratic Mock Mentor • Local Dev Fallback)*\n\n` +
        `Before jumping into code, look at the constraints:\n` +
        problem.constraints.map(c => `- \`${c}\``).join('\n') +
        `\n\n🎯 **Step 1: Constraint & Scale Check**\n` +
        `Based on the input size, what time complexity do you think the interviewer is targeting? What potential edge cases do these constraints suggest?`,
      suggestedActions: [
        'What time complexity fits these constraints?',
        'What is the straightforward brute force approach?',
        'Give me a subtle nudge on constraints'
      ]
    };
  }

  async askProblemQuestion(
    problem: Problem,
    stage: PedagogyStage,
    userMessage: string,
    history: ChatMessage[]
  ): Promise<ChatMessage> {
    await this.delay(500);
    const lower = userMessage.toLowerCase();

    // Check for common student inquiries
    if (lower.includes('brute force') || lower.includes('naive') || lower.includes('n^2') || lower.includes('all pairs')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'mentor',
        stage: 'bruteforce',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `Spot on intuition to examine the baseline first!\n\n` +
          `**Brute Force Breakdown:**\n` +
          `• Approach: ${problem.bruteForce.approach}\n` +
          `• Time Complexity: \`${problem.bruteForce.time}\`\n` +
          `• Space Complexity: \`${problem.bruteForce.space}\`\n\n` +
          `Now ask yourself: **Why is this doing redundant work?** What data structure or invariant could let us bypass the inner loop?`,
        suggestedActions: [
          'What DSA pattern helps eliminate redundant work here?',
          'Give me a nudge for the optimal pattern',
          'Advance to Pattern Identification'
        ]
      };
    }

    if (lower.includes('time complexity') || lower.includes('constraints') || lower.includes('scale')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'mentor',
        stage: 'constraints',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `Let's analyze the arithmetic:\n\n` +
          `Typically in interviews, an online judge allows ~\`10^7\` to \`10^8\` operations per second.\n` +
          `For ${problem.title}, looking at the constraints:\n` +
          `• An \`O(N^2)\` solution would execute too many operations for large inputs and likely result in **Time Limit Exceeded (TLE)**.\n` +
          `• We are clearly nudged toward an **\`${problem.optimalComplexity.time}\`** approach with **\`${problem.optimalComplexity.space}\`** space.\n\n` +
          `What key property of the input can we exploit?`,
        suggestedActions: [
          'What is the optimal pattern for this?',
          'What is the brute force?',
          'Give me a nudge'
        ]
      };
    }

    if (lower.includes('pattern') || lower.includes('data structure') || lower.includes('approach')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'mentor',
        stage: 'pattern',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `Great question. Let's look at the signals:\n\n` +
          `💡 **Pattern Clue:**\n` +
          `The core archetype here is **${problem.optimalPattern}**.\n\n` +
          `${problem.hints.nudge}\n\n` +
          `How would you formulate the relationship between the current element and your target state?`,
        suggestedActions: [
          'Give me a slightly stronger hint',
          'Can we walk through an example trace?',
          'Advance to Progressive Hints'
        ]
      };
    }

    // Default Socratic response matching the current stage
    let responseText = '';
    const nextActions: string[] = [];

    switch (stage) {
      case 'constraints':
        responseText = `You noted: "${userMessage}".\n\n` +
          `Good observation. Thinking about constraints is what separates senior problem solvers from guessers.\n` +
          `Notice: ${problem.socraticQuestions[0] || 'How do extreme inputs affect your algorithm?'}\n\n` +
          `Ready to specify the brute force approach, or do you have another constraint query?`;
        nextActions.push('Let us discuss the brute force', 'What is the optimal pattern?');
        break;

      case 'bruteforce':
        responseText = `Regarding "${userMessage}":\n\n` +
          `The brute force for **${problem.title}** runs in \`${problem.bruteForce.time}\`.\n` +
          `To optimize, we must trade space for time or leverage sorting/order.\n\n` +
          `Which trade-off feels more viable here?`;
        nextActions.push('Could a hash table help?', 'Could two pointers work?', 'Give me a hint');
        break;

      case 'pattern':
        responseText = `You asked: "${userMessage}".\n\n` +
          `Think about what operation is repeated most often in your loop. Is it searching? Is it re-calculating sums? Is it keeping track of maximums?\n\n` +
          `*Mentor Tip:* ${problem.hints.nudge}`;
        nextActions.push('Give me a stronger hint', 'Explain the step-by-step logic');
        break;

      case 'hints':
      case 'optimize':
        responseText = `Looking at your thought: "${userMessage}".\n\n` +
          `You are on the right track! ${problem.hints.hint}\n\n` +
          `Try writing down the state you need to track at each iteration. What variables would you declare?`;
        nextActions.push('Check my invariant', 'Show strong hint', 'Explain step-by-step logic');
        break;

      case 'complexity':
        responseText = `Let's break down the optimal complexity:\n\n` +
          `• **Time:** \`${problem.optimalComplexity.time}\`\n` +
          `• **Space:** \`${problem.optimalComplexity.space}\`\n\n` +
          `Notice how we achieve this: each element is processed a constant number of times.\n` +
          `Do you want to see the commented reference solution now?`;
        nextActions.push('Yes, reveal the solution', 'Let me try writing the code first');
        break;

      case 'solution':
      default:
        responseText = `Regarding "${userMessage}":\n\n` +
          `The optimal strategy relies on: **${problem.optimalPattern}**.\n\n` +
          `${problem.hints.explain}\n\n` +
          `Would you like to examine the Python reference implementation or test this on an edge case?`;
        nextActions.push('Show Solution Code', 'Test an edge case');
        break;
    }

    return {
      id: `msg-${Date.now()}`,
      sender: 'mentor',
      stage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: responseText,
      suggestedActions: nextActions
    };
  }

  async requestHint(
    problem: Problem,
    level: HintLevel,
    currentStage: PedagogyStage
  ): Promise<ChatMessage> {
    await this.delay(350);
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    switch (level) {
      case 'nudge':
        return {
          id: `msg-${Date.now()}`,
          sender: 'mentor',
          type: 'hint',
          hintLevel: 'nudge',
          stage: 'hints',
          timestamp: ts,
          content: `🌱 **Nudge (Level 1 / 5)**\n\n${problem.hints.nudge}\n\n*Take 2 minutes to pause and sketch what this means for your data structures.*`,
          suggestedActions: ['Got it, let me think', 'Need a stronger hint', 'Advance to Next Stage']
        };

      case 'hint':
        return {
          id: `msg-${Date.now()}`,
          sender: 'mentor',
          type: 'hint',
          hintLevel: 'hint',
          stage: 'hints',
          timestamp: ts,
          content: `💡 **Hint (Level 2 / 5)**\n\n${problem.hints.hint}\n\n*What would you store as your key, and what as your value/index?*`,
          suggestedActions: ['Understood! Let me try', 'Give me the Strong Hint', 'Check my approach']
        };

      case 'strong_hint':
        return {
          id: `msg-${Date.now()}`,
          sender: 'mentor',
          type: 'hint',
          hintLevel: 'strong_hint',
          stage: 'optimize',
          timestamp: ts,
          content: `⚡ **Strong Hint (Level 3 / 5)**\n\n${problem.hints.strongHint}\n\n*Almost there! Can you write pseudo-code for the loop condition and updates?*`,
          suggestedActions: ['I see it now! Let me code', 'Explain the full step-by-step', 'Explain complexity']
        };

      case 'explain':
        return {
          id: `msg-${Date.now()}`,
          sender: 'mentor',
          type: 'hint',
          hintLevel: 'explain',
          stage: 'optimize',
          timestamp: ts,
          content: `📖 **Step-by-Step Logic Breakdown (Level 4 / 5)**\n\n${problem.hints.explain}\n\n*Complexity Check:* Time is \`${problem.optimalComplexity.time}\`, Space is \`${problem.optimalComplexity.space}\`.`,
          suggestedActions: ['Show me the full reference solution', 'Let me code it first']
        };

      case 'solution':
        return {
          id: `msg-${Date.now()}`,
          sender: 'mentor',
          type: 'code',
          hintLevel: 'solution',
          stage: 'solution',
          timestamp: ts,
          content: `🎯 **Reference Solution (Level 5 / 5)**\n\n` +
            `Here is the production-grade, commented implementation in **${problem.hints.solution.language}**:\n\n` +
            `\`\`\`${problem.hints.solution.language}\n${problem.hints.solution.code}\n\`\`\`\n\n` +
            `**Key Takeaways & Complexity:**\n` +
            `${problem.hints.solution.explanation}\n\n` +
            `• **Time Complexity:** \`${problem.optimalComplexity.time}\`\n` +
            `• **Space Complexity:** \`${problem.optimalComplexity.space}\``,
          codeSnippet: {
            code: problem.hints.solution.code,
            language: problem.hints.solution.language
          },
          suggestedActions: ['Try another problem', 'Practice this concept', 'Analyze my own code']
        };
    }
  }

  async advancePedagogyStage(
    problem: Problem,
    targetStage: PedagogyStage
  ): Promise<ChatMessage> {
    await this.delay(300);
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const stageMap: Record<PedagogyStage, { title: string; content: string; actions: string[] }> = {
      constraints: {
        title: 'Step 1: Understand Constraints',
        content: `Let's focus on the constraints for **${problem.title}**:\n` +
          problem.constraints.map(c => `- \`${c}\``).join('\n') +
          `\n\nAsk yourself: what edge cases might break a simplistic solution? (e.g., negative numbers, empty arrays, single elements, duplicates)`,
        actions: ['Check brute force approach', 'What is the optimal complexity target?']
      },
      bruteforce: {
        title: 'Step 2: Identify Brute Force',
        content: `Always establish your baseline solution first. In an interview, verbalizing the brute force shows you understand the problem requirements!\n\n` +
          `• **Baseline Approach:** ${problem.bruteForce.approach}\n` +
          `• **Brute Force Time:** \`${problem.bruteForce.time}\`\n` +
          `• **Brute Force Space:** \`${problem.bruteForce.space}\`\n\n` +
          `Where is the bottleneck? Why does this waste clock cycles?`,
        actions: ['Identify the DSA pattern', 'Give me a subtle nudge']
      },
      pattern: {
        title: 'Step 3: Identify DSA Pattern',
        content: `Now let's map this problem to an archetype.\n\n` +
          `For **${problem.title}**, the optimal pattern belongs to: **${problem.optimalPattern}**.\n\n` +
          `${problem.hints.nudge}\n\n` +
          `What invariant do we need to maintain?`,
        actions: ['Give me a hint', 'Advance to Progressive Hints']
      },
      hints: {
        title: 'Step 4: Progressive Hints',
        content: `You are in progressive hint mode. Remember:\n\n` +
          `*“Think first. Hint second. Solution last.”*\n\n` +
          `Use the hint tier bar above to pick your desired level of guidance (Nudge -> Hint -> Strong Hint).`,
        actions: ['Nudge me', 'Give me a hint', 'Develop optimized approach']
      },
      optimize: {
        title: 'Step 5: Develop Optimized Approach',
        content: `Let's formalize the optimized algorithm:\n\n` +
          `${problem.hints.strongHint}\n\n` +
          `${problem.hints.explain}\n\n` +
          `Try typing this out in your mind or on paper before checking the full solution.`,
        actions: ['Explain complexity breakdown', 'Show reference solution']
      },
      complexity: {
        title: 'Step 6: Complexity Analysis',
        content: `📊 **Complexity Deep Dive:**\n\n` +
          `• **Target Time Complexity:** \`${problem.optimalComplexity.time}\`\n` +
          `• **Target Space Complexity:** \`${problem.optimalComplexity.space}\`\n\n` +
          `Can you explain to an interviewer why the space is \`${problem.optimalComplexity.space}\`? Does it count auxiliary memory or the output array?`,
        actions: ['Show reference solution', 'Review another problem']
      },
      solution: {
        title: 'Step 7: Solution Walkthrough',
        content: `Here is the full solution and analysis for **${problem.title}**:\n\n` +
          `\`\`\`${problem.hints.solution.language}\n${problem.hints.solution.code}\n\`\`\`\n\n` +
          `${problem.hints.solution.explanation}`,
        actions: ['Restart problem', 'Practice similar concept', 'Test my code']
      }
    };

    const current = stageMap[targetStage];
    return {
      id: `msg-${Date.now()}`,
      sender: 'mentor',
      type: 'stage_update',
      stage: targetStage,
      timestamp: ts,
      content: `### 🧭 ${current.title}\n\n${current.content}`,
      suggestedActions: current.actions
    };
  }

  async explainConcept(concept: Concept, query?: string): Promise<ChatMessage> {
    await this.delay(400);
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (query && query.trim().length > 0) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'mentor',
        timestamp: ts,
        content: `### Mentoring on **${concept.name}**\n\n` +
          `You asked: *"${query}"*\n\n` +
          `Here is how interviewers test this concept:\n\n` +
          `🔍 **Recognition Triggers in Problems:**\n` +
          concept.whenToRecognize.map(r => `• ${r}`).join('\n') +
          `\n\n⚠️ **Common Trap to Avoid:**\n` +
          concept.commonMistakes.map(m => `• ${m}`).join('\n') +
          `\n\n💡 **Key Takeaway:** ${concept.shortDescription}`,
        suggestedActions: [
          'Show me an archetype code example',
          'Test my understanding with a question',
          'Solve a problem using this concept'
        ]
      };
    }

    return {
      id: `msg-${Date.now()}`,
      sender: 'mentor',
      timestamp: ts,
      content: `### 📚 Deep Dive: **${concept.name}**\n\n` +
        `**What It Is:**\n${concept.whatItIs}\n\n` +
        `**When to Recognize in Interview Problems:**\n` +
        concept.whenToRecognize.map(r => `• ${r}`).join('\n') +
        `\n\n**Common Patterns:**\n` +
        concept.commonPatterns.map(p => `• **${p.name}:** ${p.description} *(e.g. ${p.problemExample})*`).join('\n') +
        `\n\n**Complexity Profile:**\n${concept.complexityTradeoffs.time}\n${concept.complexityTradeoffs.space}\n\n` +
        `**Pitfalls to Avoid:**\n` +
        concept.commonMistakes.map(m => `• ${m}`).join('\n'),
      suggestedActions: [
        'Test my understanding with the practice quiz',
        'Show an example implementation',
        'Practice a problem with this concept'
      ]
    };
  }

  async analyzeCode(
    code: string,
    language: string,
    problemContext?: string
  ): Promise<CodeAnalysis> {
    await this.delay(650);

    const trimmed = code.trim();
    const hasNestedLoop = /for[\s\S]+for|while[\s\S]+while|for[\s\S]+while/g.test(trimmed);
    const hasHash = /set\(|dict\(|\{\}|HashMap|HashSet|new Map|new Set/g.test(trimmed);
    const hasRecursion = /def (\w+)[\s\S]+\1\(/g.test(trimmed);

    let timeComplexity = 'O(N)';
    let spaceComplexity = 'O(1)';
    let bottlenecks: string[] = [];
    let detectedPattern = 'Linear Scan';
    let correctness: CodeAnalysis['correctness'] = 'Looks Correct';
    let correctnessNote = 'The code logic appears sound for primary test cases.';

    if (hasNestedLoop) {
      timeComplexity = 'O(N^2)';
      bottlenecks.push('Nested loop scanning the collection repeatedly, causing quadratic runtime.');
      bottlenecks.push('Inner iteration duplicates comparisons previously checked.');
      detectedPattern = 'Brute Force Exhaustive Enumeration';
      correctnessNote = 'May trigger Time Limit Exceeded (TLE) when N >= 10^4.';
    } else if (hasHash) {
      timeComplexity = 'O(N)';
      spaceComplexity = 'O(N)';
      detectedPattern = 'Hash Map / Frequency Cache';
      bottlenecks.push('Consumes O(N) auxiliary heap memory to trade for O(1) lookups.');
    } else if (hasRecursion) {
      timeComplexity = 'O(2^N) or O(N)';
      spaceComplexity = 'O(N) recursion stack';
      detectedPattern = 'Recursive Exploration';
      bottlenecks.push('Check base cases to avoid recursion depth / stack overflow.');
    }

    return {
      correctness,
      correctnessNote,
      timeComplexity,
      spaceComplexity,
      bottlenecks: bottlenecks.length > 0 ? bottlenecks : ['No glaring bottlenecks found in basic structure.'],
      detectedPattern,
      optimizationOpportunities: [
        hasNestedLoop 
          ? 'Replace the inner search loop with an O(1) Hash Map or Sort + Two Pointers.' 
          : 'Can we optimize auxiliary space or eliminate unnecessary variable allocations?',
        'Ensure boundaries handle empty inputs or single-element collections gracefully.'
      ],
      progressiveHints: {
        nudge: 'Look at where the most CPU cycles are spent. Can you eliminate that repeated search?',
        hint: 'If you stored previously seen elements in an auxiliary structure, what lookup speed would you achieve?',
        strongHint: 'Consider using a Hash Table or sorting the input so two pointers can close in from the edges in O(N).',
        explain: 'Instead of searching linearly for every item, compute what complementary item you need and do an instant O(1) lookup.'
      },
      optimizedCode: {
        language,
        code: language === 'python'
          ? `# Optimized Python Version\ndef optimized_solution(nums):\n    seen = {}\n    for i, x in enumerate(nums):\n        # Single-pass lookup logic\n        if x in seen:\n            return [seen[x], i]\n        seen[x] = i\n    return []`
          : `// Optimized Version\nfunction optimizedSolution(arr) {\n  const seen = new Map();\n  for (let i = 0; i < arr.length; i++) {\n    if (seen.has(arr[i])) return [seen.get(arr[i]), i];\n    seen.set(arr[i], i);\n  }\n  return [];\n}`,
        explanation: 'Single-pass approach reducing time complexity from O(N^2) to O(N) by utilizing O(N) hash lookups.'
      }
    };
  }

  async askCodeQuestion(
    code: string,
    analysis: CodeAnalysis,
    userMessage: string,
    history: ChatMessage[]
  ): Promise<ChatMessage> {
    await this.delay(450);
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      id: `msg-${Date.now()}`,
      sender: 'mentor',
      timestamp: ts,
      content: `### Code Review Mentor Insight\n\n` +
        `You asked: *"${userMessage}"*\n\n` +
        `**Your Code Profile:**\n` +
        `• Detected Time Complexity: \`${analysis.timeComplexity}\`\n` +
        `• Detected Space Complexity: \`${analysis.spaceComplexity}\`\n` +
        `• Pattern in Use: **${analysis.detectedPattern}**\n\n` +
        `**Key Opportunity:**\n${analysis.optimizationOpportunities[0]}\n\n` +
        `💡 *Mentor Nudge:* ${analysis.progressiveHints.nudge}`,
      suggestedActions: [
        'How can I optimize the space complexity?',
        'Show progressive hint 2',
        'Show optimized reference solution'
      ]
    };
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==========================================
// OPTIONAL LIVE GEMINI API SERVICE
// ==========================================
export class GeminiAIService implements AIService {
  private apiKey: string;
  private model: string;
  private fallback: MockAIService;

  constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.fallback = new MockAIService();
  }

  async startProblemSession(problem: Problem): Promise<ChatMessage> {
    try {
      const prompt = `You are AlgoBuddy, a master DSA mentor. Motto: "Think first. Hint second. Solution last."
The user is starting problem: "${problem.title}".
Difficulty: ${problem.difficulty}.
Constraints: ${problem.constraints.join(', ')}.
Initiate the first pedagogical step: Step 1 (Understand constraints). Ask the user a Socratic question about the input scale and what time complexity is acceptable. Keep it encouraging, concise, and interview-focused. Do NOT give the solution or pattern away yet.`;

      const response = await this.callGemini(prompt);
      return {
        id: `msg-${Date.now()}`,
        sender: 'mentor',
        stage: 'constraints',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: response,
        suggestedActions: [
          'What time complexity fits these constraints?',
          'What is the brute force approach?',
          'Give me a nudge'
        ]
      };
    } catch {
      return this.fallback.startProblemSession(problem);
    }
  }

  async askProblemQuestion(
    problem: Problem,
    stage: PedagogyStage,
    userMessage: string,
    history: ChatMessage[]
  ): Promise<ChatMessage> {
    try {
      const historyContext = history.slice(-5).map(m => `${m.sender.toUpperCase()}: ${m.content}`).join('\n');
      const prompt = `You are AlgoBuddy, a DSA mentor adhering to: "Think first. Hint second. Solution last."
Problem: "${problem.title}"
Current Pedagogy Stage: ${stage}
Optimal Pattern: ${problem.optimalPattern}
Brute Force: ${problem.bruteForce.approach} (${problem.bruteForce.time})
Optimal: ${problem.optimalComplexity.time}, ${problem.optimalComplexity.space}

Recent Chat:
${historyContext}

USER: ${userMessage}

Respond as the mentor. Guide them Socratically according to the current stage (${stage}). Do NOT dump the full code solution unless explicitly instructed. Keep formatting clean with markdown.`;

      const text = await this.callGemini(prompt);
      return {
        id: `msg-${Date.now()}`,
        sender: 'mentor',
        stage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: text,
        suggestedActions: [
          'Give me a hint',
          'Check my approach',
          'Advance to next stage'
        ]
      };
    } catch {
      return this.fallback.askProblemQuestion(problem, stage, userMessage, history);
    }
  }

  async requestHint(problem: Problem, level: HintLevel, currentStage: PedagogyStage): Promise<ChatMessage> {
    return this.fallback.requestHint(problem, level, currentStage);
  }

  async advancePedagogyStage(problem: Problem, targetStage: PedagogyStage): Promise<ChatMessage> {
    return this.fallback.advancePedagogyStage(problem, targetStage);
  }

  async explainConcept(concept: Concept, query?: string): Promise<ChatMessage> {
    if (!query) return this.fallback.explainConcept(concept);
    try {
      const prompt = `You are AlgoBuddy, DSA mentor.
Concept: ${concept.name} (${concept.shortDescription})
User asks: "${query}"
Explain clearly, focusing on:
1. When to recognize this in interviews
2. Common pitfalls/mistakes
3. Complexity trade-offs
Do not be overly verbose. Use bullet points and markdown.`;
      const text = await this.callGemini(prompt);
      return {
        id: `msg-${Date.now()}`,
        sender: 'mentor',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: text,
        suggestedActions: [
          'Show me an example code snippet',
          'Test my understanding with a quiz'
        ]
      };
    } catch {
      return this.fallback.explainConcept(concept, query);
    }
  }

  async analyzeCode(code: string, language: string, problemContext?: string): Promise<CodeAnalysis> {
    return this.fallback.analyzeCode(code, language, problemContext);
  }

  async askCodeQuestion(
    code: string,
    analysis: CodeAnalysis,
    userMessage: string,
    history: ChatMessage[]
  ): Promise<ChatMessage> {
    return this.fallback.askCodeQuestion(code, analysis, userMessage, history);
  }

  private async callGemini(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1000 }
      })
    });
    if (!resp.ok) {
      throw new Error(`Gemini API error: ${resp.statusText}`);
    }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received from Gemini.';
  }
}

// ==========================================
// ==========================================
// PRIMARY OPEN-WEIGHT MODEL: GEMMA AI SERVICE
// ==========================================
export class GemmaAIService implements AIService {
  private settings?: AISettings;

  constructor(settings?: AISettings) {
    this.settings = settings;
  }

  // 1. Problem Mode: Start Socratic Session
  async startProblemSession(problem: Problem): Promise<ChatMessage> {
    try {
      const systemPrompt = buildProblemStagePrompt(
        problem.title,
        problem.difficulty,
        'constraints',
        problem.constraints,
        problem.bruteForce,
        problem.optimalPattern,
        problem.optimalComplexity
      );
      const prompt = `The user is beginning the problem: "${problem.title}".
Difficulty: ${problem.difficulty}.
Constraints:
${problem.constraints.map(c => `- ${c}`).join('\n')}

Description:
${problem.description}

Initiate Step 1 (Understand Constraints). Welcome them enthusiastically with our pedagogical motto: "Think first. Hint second. Solution last."
Ask a targeted Socratic question about the input scale and allowable time complexity. Do NOT reveal the brute force or optimal pattern.`;

      const response = await this.callGemmaBackend(systemPrompt, prompt);
      if (response.success && response.text) {
        return {
          id: `msg-${Date.now()}`,
          sender: 'mentor',
          stage: 'constraints',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: response.text,
          suggestedActions: [
            'What time complexity fits these constraints?',
            'What is the straightforward brute force approach?',
            'Give me a subtle nudge on constraints'
          ]
        };
      }
      return this.formatConfigurationError('constraints', response.error || 'Unknown error communicating with Gemma backend.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.formatConfigurationError('constraints', msg);
    }
  }

  // 1. Problem Mode: Socratic Dialogue
  async askProblemQuestion(
    problem: Problem,
    stage: PedagogyStage,
    userMessage: string,
    history: ChatMessage[]
  ): Promise<ChatMessage> {
    try {
      const systemPrompt = buildProblemStagePrompt(
        problem.title,
        problem.difficulty,
        stage,
        problem.constraints,
        problem.bruteForce,
        problem.optimalPattern,
        problem.optimalComplexity
      );
      const prompt = `CURRENT STAGE: ${stage.toUpperCase()}
USER QUERY / OBSERVATION: "${userMessage}"

Respond as the mentor adhering strictly to "Think first. Hint second. Solution last."
If they ask for brute force, discuss the brute force baseline (${problem.bruteForce.approach}, ${problem.bruteForce.time}).
If they ask for pattern, guide them toward ${problem.optimalPattern}.
Do NOT reveal the complete code solution unless the stage is 'solution' or they explicitly request it.`;

      const response = await this.callGemmaBackend(systemPrompt, prompt, history);
      if (response.success && response.text) {
        return {
          id: `msg-${Date.now()}`,
          sender: 'mentor',
          stage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: response.text,
          suggestedActions: [
            'Give me a hint',
            'What is the optimal pattern?',
            'Advance to next stage'
          ]
        };
      }
      return this.formatConfigurationError(stage, response.error || 'Failed to receive inference response from Gemma.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.formatConfigurationError(stage, msg);
    }
  }

  // 1. Problem Mode: Progressive Hinting
  async requestHint(
    problem: Problem,
    level: HintLevel,
    currentStage: PedagogyStage
  ): Promise<ChatMessage> {
    try {
      const systemPrompt = ALGOBUDDY_SYSTEM_PROMPT;
      const prompt = `Problem: "${problem.title}" (${problem.difficulty})
Pattern: ${problem.optimalPattern}
Brute Force: ${problem.bruteForce.approach} (${problem.bruteForce.time})
Optimal Complexity: ${problem.optimalComplexity.time}, ${problem.optimalComplexity.space}

HINT REFERENCE:
- Level 1 Nudge: ${problem.hints.nudge}
- Level 2 Hint: ${problem.hints.hint}
- Level 3 Strong Hint: ${problem.hints.strongHint}
- Level 4 Explain: ${problem.hints.explain}
- Level 5 Solution: ${problem.hints.solution.code}

USER HAS EXPLICITLY REQUESTED HINT LEVEL: "${level.toUpperCase()}" (out of 5 levels: Nudge -> Hint -> Strong Hint -> Explain -> Solution).
Deliver the hint appropriate for this level. Follow "Think first. Hint second. Solution last."`;

      const response = await this.callGemmaBackend(systemPrompt, prompt);
      if (response.success && response.text) {
        const nextStage = level === 'nudge' || level === 'hint' ? 'hints' : level === 'solution' ? 'solution' : 'optimize';
        return {
          id: `msg-${Date.now()}`,
          sender: 'mentor',
          type: level === 'solution' ? 'code' : 'hint',
          hintLevel: level,
          stage: nextStage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: response.text,
          codeSnippet: level === 'solution' ? {
            code: problem.hints.solution.code,
            language: problem.hints.solution.language
          } : undefined,
          suggestedActions: level === 'solution' 
            ? ['Try another problem', 'Practice this concept', 'Analyze my own code']
            : ['Understood! Let me try', 'Need a stronger hint', 'Advance to next stage']
        };
      }
      return this.formatConfigurationError(currentStage, response.error || 'Failed to generate hint with Gemma.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.formatConfigurationError(currentStage, msg);
    }
  }

  // 1. Problem Mode: Pedagogy Stage Advancement
  async advancePedagogyStage(
    problem: Problem,
    targetStage: PedagogyStage
  ): Promise<ChatMessage> {
    try {
      const systemPrompt = buildProblemStagePrompt(
        problem.title,
        problem.difficulty,
        targetStage,
        problem.constraints,
        problem.bruteForce,
        problem.optimalPattern,
        problem.optimalComplexity
      );
      const prompt = `The user has moved forward to stage: ${targetStage.toUpperCase()}.
Introduce this milestone Socratically. Clearly explain what the candidate should be focusing on at this step for "${problem.title}".`;

      const response = await this.callGemmaBackend(systemPrompt, prompt);
      if (response.success && response.text) {
        return {
          id: `msg-${Date.now()}`,
          sender: 'mentor',
          type: 'stage_update',
          stage: targetStage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: response.text,
          suggestedActions: [
            'Check brute force approach',
            'Identify the optimal pattern',
            'Give me a nudge'
          ]
        };
      }
      return this.formatConfigurationError(targetStage, response.error || 'Failed to advance stage with Gemma.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.formatConfigurationError(targetStage, msg);
    }
  }

  // 2. Concept Mode: Deep-Dive & Practice
  async explainConcept(concept: Concept, query?: string): Promise<ChatMessage> {
    try {
      const systemPrompt = buildConceptExplanationPrompt(
        concept.name,
        concept.whatItIs,
        concept.whenToRecognize,
        concept.commonPatterns,
        concept.commonMistakes,
        concept.complexityTradeoffs.time,
        concept.complexityTradeoffs.space,
        query
      );
      const prompt = query 
        ? `The learner has a question about ${concept.name}: "${query}". Explain Socratically with triggers, complexity, and common traps.`
        : `Provide a masterclass Socratic explanation of ${concept.name}.`;

      const response = await this.callGemmaBackend(systemPrompt, prompt);
      if (response.success && response.text) {
        return {
          id: `msg-${Date.now()}`,
          sender: 'mentor',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: response.text,
          suggestedActions: [
            'Test my understanding with a question',
            'Show an archetype code example',
            'Practice a problem with this concept'
          ]
        };
      }
      return this.formatConfigurationError('constraints', response.error || 'Failed to explain concept with Gemma.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.formatConfigurationError('constraints', msg);
    }
  }

  // 3. Code Mode: Code Analysis & Bottleneck Identification
  async analyzeCode(
    code: string,
    language: string,
    problemContext?: string
  ): Promise<CodeAnalysis> {
    const provider = this.settings?.gemmaProvider || 'huggingface';
    const model = this.settings?.gemmaModel || 'google/gemma-3-12b-it';

    try {
      const systemPrompt = buildCodeAnalysisPrompt(code, language, problemContext);
      const prompt = `Analyze this code and return JSON only:
\`\`\`${language}
${code}
\`\`\``;

      const response = await this.callGemmaBackend(systemPrompt, prompt);
      if (response.success && response.text) {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Partial<CodeAnalysis>;
          if (parsed.timeComplexity && parsed.spaceComplexity) {
            return {
              correctness: parsed.correctness || 'Looks Correct',
              correctnessNote: parsed.correctnessNote || `Analysis completed by real Google Gemma model (${model}).`,
              timeComplexity: parsed.timeComplexity,
              spaceComplexity: parsed.spaceComplexity,
              bottlenecks: parsed.bottlenecks || ['Review inner iterations for redundant work.'],
              detectedPattern: parsed.detectedPattern || 'Algorithmic logic',
              optimizationOpportunities: parsed.optimizationOpportunities || ['Consider space/time trade-off.'],
              progressiveHints: parsed.progressiveHints || {
                nudge: 'Look at the innermost loop operation.',
                hint: 'Can you store past results in memory?',
                strongHint: 'Consider using a hash table or two pointers.',
                explain: 'Trade space for time by storing seen values.'
              },
              optimizedCode: parsed.optimizedCode
            };
          }
        }
      }
      throw new Error(`Unable to parse valid code analysis JSON from Gemma (${model})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        correctness: 'Pending',
        correctnessNote: `⚠️ ${provider.toUpperCase()} (${model}) inference error: ${msg}`,
        timeComplexity: 'Configuration Required',
        spaceComplexity: 'Configuration Required',
        bottlenecks: [`Inference failed: ${msg}`],
        detectedPattern: 'Setup Required',
        optimizationOpportunities: [
          'Configure HF_TOKEN in server .env or in Settings (⚙️) to enable real Gemma code analysis.',
          'Switch to Socratic Mock (Dev Fallback) in Settings for offline development.'
        ],
        progressiveHints: {
          nudge: `Configure your ${provider.toUpperCase()} API key in Settings or .env to analyze this code.`,
          hint: 'Configure API key in Settings or switch to Socratic Mock.',
          strongHint: 'Configure API key in Settings or switch to Socratic Mock.',
          explain: 'Configure API key in Settings or switch to Socratic Mock.'
        }
      };
    }
  }

  // 3. Code Mode: Socratic Code Dialogue
  async askCodeQuestion(
    code: string,
    analysis: CodeAnalysis,
    userMessage: string,
    history: ChatMessage[]
  ): Promise<ChatMessage> {
    try {
      const systemPrompt = `${ALGOBUDDY_SYSTEM_PROMPT}

CODE UNDER ANALYSIS:
\`\`\`
${code}
\`\`\`
ANALYSIS:
- Time: ${analysis.timeComplexity}
- Space: ${analysis.spaceComplexity}
- Pattern: ${analysis.detectedPattern}
- Bottlenecks: ${analysis.bottlenecks.join(' | ')}
- Optimizations: ${analysis.optimizationOpportunities.join(' | ')}`;

      const prompt = `USER QUESTION: "${userMessage}".
Guide the user Socratically on how to address bottlenecks and optimize their code according to "Think first. Hint second. Solution last."`;

      const response = await this.callGemmaBackend(systemPrompt, prompt, history);
      if (response.success && response.text) {
        return {
          id: `msg-${Date.now()}`,
          sender: 'mentor',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: response.text,
          suggestedActions: [
            'How can I optimize the space complexity?',
            'Show progressive hint',
            'Show optimized reference solution'
          ]
        };
      }
      return this.formatConfigurationError('optimize', response.error || 'Failed to receive code consultation from Gemma.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.formatConfigurationError('optimize', msg);
    }
  }

  private formatConfigurationError(stage: PedagogyStage, errorMessage: string): ChatMessage {
    const provider = this.settings?.gemmaProvider || 'huggingface';
    const model = this.settings?.gemmaModel || 'google/gemma-3-12b-it';

    return {
      id: `err-${Date.now()}`,
      sender: 'mentor',
      stage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: `⚠️ **Google Gemma Hosted Inference Error**\n\n` +
        `Unable to reach Google Gemma model **\`${model}\`** via **${provider.toUpperCase()}**.\n\n` +
        `**Error Details:**\n> ${errorMessage}\n\n` +
        `**How to resolve:**\n` +
        `1. Add your Hugging Face API token to your server \`.env\` file:\n` +
        `   \`\`\`bash\n   HF_TOKEN=hf_your_token_here\n   \`\`\`\n` +
        `2. Or open **Settings** (⚙️ top right in the navigation bar) and enter your API key.\n` +
        `3. For offline development without an API key, switch the AI Engine to **Socratic Mock (Dev Fallback)** in Settings.`,
      suggestedActions: [
        'Open Settings (⚙️)',
        'Retry Connection'
      ]
    };
  }

  private async callGemmaBackend(
    systemPrompt: string, 
    prompt: string, 
    history?: ChatMessage[]
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    const messages = history ? history.slice(-6).map(m => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.content
    })) : [];
    messages.push({ role: 'user' as const, content: prompt });

    const payload = {
      action: 'chat',
      systemPrompt,
      messages,
      temperature: 0.3,
      provider: this.settings?.gemmaProvider || 'huggingface',
      model: this.settings?.gemmaModel || 'google/gemma-3-12b-it',
      apiKey: this.settings?.gemmaApiKey,
      endpoint: this.settings?.gemmaEndpoint
    };

    const apiEndpoint = typeof window !== 'undefined' ? '/api/gemma' : 'http://127.0.0.1:5173/api/gemma';
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data: { success: boolean; text?: string; error?: string };
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned HTTP ${res.status} with non-JSON response.`);
    }

    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP ${res.status}: Failed to reach Gemma inference endpoint`);
    }

    return data;
  }
}

// Factory to retrieve active AIService based on user settings
// Gemma (Hosted Open Model) is the PRIMARY AI service engine
export function getAIService(settings?: AISettings): AIService {
  if (!settings || settings.provider === 'gemma') {
    return new GemmaAIService(settings);
  }
  if (settings.provider === 'gemini' && settings.geminiApiKey) {
    return new GeminiAIService(settings.geminiApiKey, settings.model || 'gemini-1.5-flash');
  }
  return new MockAIService();
}


