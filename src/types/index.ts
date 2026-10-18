export type AppMode = 'problem' | 'concept' | 'code';
export type AppView = 'home' | 'workspace' | 'concepts' | 'progress';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ConceptDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type ConceptStatus = 'Mastered' | 'In Progress' | 'Needs Review' | 'Unstarted';

export type HintLevel = 'nudge' | 'hint' | 'strong_hint' | 'explain' | 'solution';

export type PedagogyStage = 
  | 'constraints'    // 1. Understand constraints
  | 'bruteforce'     // 2. Identify brute force
  | 'pattern'        // 3. Identify pattern
  | 'hints'          // 4. Progressive hints
  | 'optimize'       // 5. Develop optimized approach
  | 'complexity'     // 6. Explain complexity
  | 'solution';      // 7. Solution only when requested

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  description: string;
  examples: ProblemExample[];
  constraints: string[];
  starterCode?: Record<string, string>;
  bruteForce: {
    approach: string;
    time: string;
    space: string;
  };
  optimalPattern: string;
  optimalComplexity: {
    time: string;
    space: string;
  };
  hints: {
    nudge: string;
    hint: string;
    strongHint: string;
    explain: string;
    solution: {
      language: string;
      code: string;
      explanation: string;
    };
  };
  socraticQuestions: string[];
  category: string;
}

export interface ConceptPattern {
  name: string;
  description: string;
  problemExample: string;
}

export interface PracticeQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Concept {
  id: string;
  name: string;
  category: string;
  difficulty: ConceptDifficulty;
  shortDescription: string;
  whatItIs: string;
  whenToRecognize: string[];
  commonPatterns: ConceptPattern[];
  simpleExample: {
    problem: string;
    explanation: string;
    codeSnippet: string;
    language: string;
  };
  commonMistakes: string[];
  complexityTradeoffs: {
    time: string;
    space: string;
    notes: string;
  };
  practiceQuestion: PracticeQuestion;
  status: ConceptStatus;
}

export interface CodeAnalysis {
  correctness: 'Looks Correct' | 'Logical Flaw' | 'Edge Case Issue' | 'TLE Likely' | 'Pending';
  correctnessNote: string;
  timeComplexity: string;
  spaceComplexity: string;
  bottlenecks: string[];
  detectedPattern: string;
  optimizationOpportunities: string[];
  progressiveHints: {
    nudge: string;
    hint: string;
    strongHint: string;
    explain: string;
  };
  optimizedCode?: {
    language: string;
    code: string;
    explanation: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'mentor' | 'system';
  content: string;
  timestamp: string;
  type?: 'default' | 'hint' | 'socratic_question' | 'code' | 'complexity' | 'stage_update';
  hintLevel?: HintLevel;
  stage?: PedagogyStage;
  suggestedActions?: string[];
  codeSnippet?: {
    code: string;
    language: string;
  };
}

export interface MentorSession {
  id: string;
  title: string;
  mode: AppMode;
  problemId?: string;
  conceptId?: string;
  userCode?: string;
  language?: string;
  currentStage: PedagogyStage;
  highestHintLevel: HintLevel | null;
  messages: ChatMessage[];
  updatedAt: string;
  completed?: boolean;
}

export type LearningEventType =
  | 'problem_opened'
  | 'hint_requested'
  | 'stage_advanced'
  | 'code_analyzed'
  | 'problem_completed'
  | 'problem_uncompleted'
  | 'concept_studied'
  | 'quiz_attempted';

export type CompletionVerification = 'self_reported' | 'unverified';

export interface ProblemCompletionRecord {
  problemId: string;
  completedAt: string;
  highestHintLevel: HintLevel | null | undefined;
  selfReported: boolean;
  verification?: CompletionVerification;
}

export interface LearningEvent {
  id: string;
  type: LearningEventType;
  targetId: string;
  targetType: 'problem' | 'concept' | 'code';
  timestamp: string; // ISO string
  metadata?: {
    hintLevel?: HintLevel;
    stage?: PedagogyStage;
    quizCorrect?: boolean;
    highestHintLevel?: HintLevel | null;
    selfReported?: boolean;
    verification?: CompletionVerification;
    language?: string;
    [key: string]: unknown;
  };
}

export interface TopicWeaknessReport {
  topic: string;
  status: 'Needs Practice' | 'Developing' | 'Proficient' | 'Insufficient Data';
  sessionCount: number;
  hintHeavyCount: number;
  reason: string;
  urgency: 'High' | 'Medium' | 'Low' | 'None';
  lastUpdated?: string;
}

export interface UserStats {
  problemsPracticed: number;
  conceptsReviewed: number;
  currentStreak: number;
  weakAreas: {
    topic: string;
    reason: string;
    urgency: 'High' | 'Medium' | 'Low';
  }[];
  recentlyStudied: {
    id: string;
    type: 'concept' | 'problem';
    name: string;
    date: string;
    difficulty: string;
  }[];
  recommendedNext: {
    id: string;
    type: 'concept' | 'problem';
    name: string;
    tag: string;
    reason: string;
    mode: AppMode;
  }[];
  hintReliance?: {
    averageLevel: number | null;
    evaluatedSessions: number;
    label: string;
  };
  difficultyBreakdown?: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export type AIProvider = 'gemma' | 'mock' | 'gemini';
export type GemmaBackendProvider = 'huggingface' | 'openrouter' | 'ollama' | 'custom';

export interface AISettings {
  provider: AIProvider;
  gemmaProvider?: GemmaBackendProvider;
  gemmaModel?: string;
  gemmaApiKey?: string;
  gemmaEndpoint?: string;
  geminiApiKey?: string;
  model?: string;
  mentorStrictness: 'strict' | 'balanced' | 'exploratory';
}

export type RecommendationCategory = 'weak_topic' | 'concept_bridge' | 'review' | 'practice';

export interface ProblemRecommendation {
  problemId: string;
  problem: Problem;
  category: RecommendationCategory;
  reason: string;
  evidence: string;
  priority: number;
  topic?: string;
  conceptId?: string;
}

export interface SpacedReviewRecord {
  problemId: string;
  completionDate: string;
  stage: number;
  intervalDays: number;
  nextReviewDate: string | null;
  lastReviewedDate?: string;
  reviewCount: number;
  reviewDateUnavailable?: boolean;
}
