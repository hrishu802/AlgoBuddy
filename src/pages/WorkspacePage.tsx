import React, { useState, useEffect } from 'react';
import { 
  AppMode, 
  Problem, 
  Concept, 
  PedagogyStage, 
  HintLevel, 
  ChatMessage, 
  CodeAnalysis, 
  AISettings,
  ConceptStatus
} from '../types';
import { AIService, MockAIService } from '../services/ai/aiService';
import { PedagogyStageBar } from '../components/PedagogyStageBar';
import { HintControls } from '../components/HintControls';
import { ProblemContext } from '../components/ProblemContext';
import { ConceptContext } from '../components/ConceptContext';
import { CodeContext } from '../components/CodeContext';
import { MentorChat } from '../components/MentorChat';
import { 
  Compass, 
  BookOpen, 
  Code2, 
  RotateCcw, 
  PanelLeftClose, 
  PanelLeftOpen,
  HelpCircle
} from 'lucide-react';
import { 
  findSavedSession, 
  saveMentorSession, 
  deleteSavedSession,
  recordLearningEvent,
  getCompletedProblemIds
} from '../services/storage';
import { toLocalDateString } from '../services/analytics';

interface WorkspacePageProps {
  initialMode: AppMode;
  currentProblem: Problem;
  allProblems: Problem[];
  onSelectProblem: (problem: Problem) => void;
  currentConcept: Concept;
  allConcepts: Concept[];
  onSelectConcept: (concept: Concept) => void;
  onUpdateConceptStatus?: (conceptId: string, status: ConceptStatus) => void;
  aiService: AIService;
  settings: AISettings;
  onOpenNewProblem: () => void;
  onStatsUpdate?: () => void;
  onOpenSettings?: () => void;
  onUpdateSettings?: (settings: AISettings) => void;
}

const isErrorMessage = (msg: ChatMessage) =>
  msg.id.startsWith('err-') ||
  msg.type === 'error' ||
  msg.content.includes('Hosted Inference Error') ||
  msg.content.includes('Credits Exhausted');

function appendMessageConsolidated(list: ChatMessage[], newMsg: ChatMessage): ChatMessage[] {
  if (isErrorMessage(newMsg)) {
    // If the list already ends with an error message, replace it instead of accumulating duplicates
    if (list.length > 0 && isErrorMessage(list[list.length - 1])) {
      return [...list.slice(0, -1), newMsg];
    }
  }
  return [...list, newMsg];
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  initialMode,
  currentProblem,
  allProblems,
  onSelectProblem,
  currentConcept,
  allConcepts,
  onSelectConcept,
  onUpdateConceptStatus,
  aiService,
  settings,
  onOpenNewProblem,
  onStatsUpdate,
  onOpenSettings,
  onUpdateSettings,
}) => {
  const [activeMode, setActiveMode] = useState<AppMode>(initialMode);
  const [currentStage, setCurrentStage] = useState<PedagogyStage>('constraints');
  const [highestHintLevel, setHighestHintLevel] = useState<HintLevel | null>(null);
  
  // Track last failed action for seamless 1-click retry
  const [lastFailedAction, setLastFailedAction] = useState<{
    mode: AppMode;
    type: 'init_problem' | 'init_concept' | 'chat_problem' | 'chat_concept' | 'hint' | 'stage' | 'code_analysis' | 'code_chat';
    text?: string;
    hintLevel?: HintLevel;
    stage?: PedagogyStage;
  } | null>(null);

  // Problem completion tracking
  const [isProblemCompleted, setIsProblemCompleted] = useState<boolean>(() => {
    return getCompletedProblemIds().has(currentProblem.id);
  });

  useEffect(() => {
    setIsProblemCompleted(getCompletedProblemIds().has(currentProblem.id));
  }, [currentProblem.id]);

  // Chat State per mode
  const [problemMessages, setProblemMessages] = useState<ChatMessage[]>([]);
  const [conceptMessages, setConceptMessages] = useState<ChatMessage[]>([]);
  const [codeMessages, setCodeMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Code Mode State
  const [userCode, setUserCode] = useState<string>(
    `def two_sum(nums, target):\n    # Quadratic brute force solution\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []`
  );
  const [codeLanguage, setCodeLanguage] = useState('python');
  const [codeAnalysis, setCodeAnalysis] = useState<CodeAnalysis | null>(null);
  const [isAnalyzingCode, setIsAnalyzingCode] = useState(false);

  // Pane collapse toggle for mobile/responsive focus
  const [contextCollapsed, setContextCollapsed] = useState(false);

  // Active problem context for code analysis
  const activeProblemContext = currentProblem
    ? `Problem: "${currentProblem.title}" (${currentProblem.difficulty})\nConstraints: ${currentProblem.constraints.join(' | ')}\nTarget Complexity: Time ${currentProblem.optimalComplexity.time}, Space ${currentProblem.optimalComplexity.space}`
    : undefined;

  // Session persistence helpers
  const persistProblemSession = (
    messages: ChatMessage[],
    stage: PedagogyStage = currentStage,
    hintLevel: HintLevel | null = highestHintLevel,
    completed: boolean = isProblemCompleted
  ) => {
    const cleanMessages = messages.filter(m => !isErrorMessage(m));
    if (cleanMessages.length === 0) return;
    saveMentorSession({
      id: `session-problem-${currentProblem.id}`,
      title: currentProblem.title,
      mode: 'problem',
      problemId: currentProblem.id,
      currentStage: stage,
      highestHintLevel: hintLevel,
      completed,
      messages: cleanMessages,
      updatedAt: new Date().toISOString()
    });
  };

  const persistConceptSession = (messages: ChatMessage[]) => {
    const cleanMessages = messages.filter(m => !isErrorMessage(m));
    if (cleanMessages.length === 0) return;
    saveMentorSession({
      id: `session-concept-${currentConcept.id}`,
      title: currentConcept.name,
      mode: 'concept',
      conceptId: currentConcept.id,
      currentStage: 'constraints',
      highestHintLevel: null,
      messages: cleanMessages,
      updatedAt: new Date().toISOString()
    });
  };

  const persistCodeSession = (
    messages: ChatMessage[],
    code: string = userCode,
    lang: string = codeLanguage
  ) => {
    const cleanMessages = messages.filter(m => !isErrorMessage(m));
    if (cleanMessages.length === 0) return;
    saveMentorSession({
      id: `session-code-${currentProblem.id}`,
      title: `Code: ${currentProblem.title}`,
      mode: 'code',
      problemId: currentProblem.id,
      userCode: code,
      language: lang,
      currentStage: 'optimize',
      highestHintLevel: null,
      messages: cleanMessages,
      updatedAt: new Date().toISOString()
    });
  };

  // Sync mode with props
  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  // Idempotent Problem Opened Tracking
  useEffect(() => {
    recordLearningEvent({
      id: `open-${currentProblem.id}-${toLocalDateString(new Date())}`,
      type: 'problem_opened',
      targetId: currentProblem.id,
      targetType: 'problem',
      metadata: { stage: currentStage }
    });
    onStatsUpdate?.();
  }, [currentProblem.id]);

  // Idempotent Concept Studied Tracking
  useEffect(() => {
    if (activeMode === 'concept') {
      recordLearningEvent({
        id: `concept-${currentConcept.id}-${toLocalDateString(new Date())}`,
        type: 'concept_studied',
        targetId: currentConcept.id,
        targetType: 'concept'
      });
      onStatsUpdate?.();
    }
  }, [activeMode, currentConcept.id]);

  // Initialize or Restore Problem Session
  useEffect(() => {
    let isMounted = true;
    setCodeAnalysis(null); // Clear stale code analysis when switching problems

    const saved = findSavedSession('problem', currentProblem.id);
    if (saved && saved.messages && saved.messages.length > 0 && !saved.messages.every(isErrorMessage)) {
      setProblemMessages(saved.messages);
      setCurrentStage(saved.currentStage || 'constraints');
      setHighestHintLevel(saved.highestHintLevel ?? null);
      return () => { isMounted = false; };
    }

    async function initProblem() {
      setIsLoading(true);
      try {
        const welcomeMsg = await aiService.startProblemSession(currentProblem);
        if (isMounted) {
          const initialMsgs = [welcomeMsg];
          setProblemMessages(initialMsgs);
          setCurrentStage('constraints');
          setHighestHintLevel(null);
          if (isErrorMessage(welcomeMsg)) {
            setLastFailedAction({ mode: 'problem', type: 'init_problem' });
          } else {
            setLastFailedAction(null);
            saveMentorSession({
              id: `session-problem-${currentProblem.id}`,
              title: currentProblem.title,
              mode: 'problem',
              problemId: currentProblem.id,
              currentStage: 'constraints',
              highestHintLevel: null,
              messages: initialMsgs,
              updatedAt: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setLastFailedAction({ mode: 'problem', type: 'init_problem' });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    initProblem();
    return () => { isMounted = false; };
  }, [currentProblem.id]);

  // Initialize or Restore Concept Session
  useEffect(() => {
    let isMounted = true;
    const saved = findSavedSession('concept', currentConcept.id);
    if (saved && saved.messages && saved.messages.length > 0 && !saved.messages.every(isErrorMessage)) {
      setConceptMessages(saved.messages);
      return () => { isMounted = false; };
    }

    async function initConcept() {
      setIsLoading(true);
      try {
        const msg = await aiService.explainConcept(currentConcept);
        if (isMounted) {
          const initialMsgs = [msg];
          setConceptMessages(initialMsgs);
          if (isErrorMessage(msg)) {
            setLastFailedAction({ mode: 'concept', type: 'init_concept' });
          } else {
            setLastFailedAction(null);
            saveMentorSession({
              id: `session-concept-${currentConcept.id}`,
              title: currentConcept.name,
              mode: 'concept',
              conceptId: currentConcept.id,
              currentStage: 'constraints',
              highestHintLevel: null,
              messages: initialMsgs,
              updatedAt: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setLastFailedAction({ mode: 'concept', type: 'init_concept' });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    initConcept();
    return () => { isMounted = false; };
  }, [currentConcept.id]);

  // Restore Code Session on problem change
  useEffect(() => {
    const saved = findSavedSession('code', currentProblem.id) || findSavedSession('code');
    if (saved && saved.messages && saved.messages.length > 0) {
      setCodeMessages(saved.messages);
      if (saved.userCode) setUserCode(saved.userCode);
      if (saved.language) setCodeLanguage(saved.language);
    }
  }, [currentProblem.id]);

  // Handle User Chat Message
  const handleSendMessage = async (text: string): Promise<boolean> => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (activeMode === 'problem') {
      const cleanHistory = problemMessages.length > 0 && isErrorMessage(problemMessages[problemMessages.length - 1])
        ? problemMessages.slice(0, -1)
        : problemMessages;
      const nextHistory = [...cleanHistory, userMsg];
      setProblemMessages(nextHistory);
      setIsLoading(true);
      try {
        const response = await aiService.askProblemQuestion(
          currentProblem,
          currentStage,
          text,
          nextHistory
        );
        const updated = appendMessageConsolidated(nextHistory, response);
        setProblemMessages(updated);
        if (isErrorMessage(response)) {
          setLastFailedAction({ mode: 'problem', type: 'chat_problem', text });
          return false;
        } else {
          persistProblemSession(updated);
          setLastFailedAction(null);
          return true;
        }
      } catch (e) {
        console.error(e);
        setLastFailedAction({ mode: 'problem', type: 'chat_problem', text });
        return false;
      } finally {
        setIsLoading(false);
      }
    } else if (activeMode === 'concept') {
      const cleanHistory = conceptMessages.length > 0 && isErrorMessage(conceptMessages[conceptMessages.length - 1])
        ? conceptMessages.slice(0, -1)
        : conceptMessages;
      const nextHistory = [...cleanHistory, userMsg];
      setConceptMessages(nextHistory);
      setIsLoading(true);
      try {
        const response = await aiService.explainConcept(currentConcept, text);
        const updated = appendMessageConsolidated(nextHistory, response);
        setConceptMessages(updated);
        if (isErrorMessage(response)) {
          setLastFailedAction({ mode: 'concept', type: 'chat_concept', text });
          return false;
        } else {
          persistConceptSession(updated);
          setLastFailedAction(null);
          return true;
        }
      } catch (e) {
        console.error(e);
        setLastFailedAction({ mode: 'concept', type: 'chat_concept', text });
        return false;
      } finally {
        setIsLoading(false);
      }
    } else {
      const cleanHistory = codeMessages.length > 0 && isErrorMessage(codeMessages[codeMessages.length - 1])
        ? codeMessages.slice(0, -1)
        : codeMessages;
      const nextHistory = [...cleanHistory, userMsg];
      setCodeMessages(nextHistory);
      setIsLoading(true);
      try {
        if (codeAnalysis) {
          const response = await aiService.askCodeQuestion(userCode, codeAnalysis, text, nextHistory);
          const updated = appendMessageConsolidated(nextHistory, response);
          setCodeMessages(updated);
          if (isErrorMessage(response)) {
            setLastFailedAction({ mode: 'code', type: 'code_chat', text });
            return false;
          } else {
            persistCodeSession(updated);
            setLastFailedAction(null);
            return true;
          }
        } else {
          const analysis = await aiService.analyzeCode(userCode, codeLanguage, activeProblemContext);
          setCodeAnalysis(analysis);
          const response = await aiService.askCodeQuestion(userCode, analysis, text, nextHistory);
          const updated = appendMessageConsolidated(nextHistory, response);
          setCodeMessages(updated);
          if (isErrorMessage(response)) {
            setLastFailedAction({ mode: 'code', type: 'code_chat', text });
            return false;
          } else {
            persistCodeSession(updated);
            setLastFailedAction(null);
            return true;
          }
        }
      } catch (e) {
        console.error(e);
        setLastFailedAction({ mode: 'code', type: 'code_chat', text });
        return false;
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle 1-click retry of the last failed request without stacking identical cards
  const handleRetry = async () => {
    setIsLoading(true);

    try {
      const isInitialProblem = activeMode === 'problem' &&
        (lastFailedAction?.type === 'init_problem' || !problemMessages.some(m => m.sender === 'user'));
      const isInitialConcept = activeMode === 'concept' &&
        (lastFailedAction?.type === 'init_concept' || !conceptMessages.some(m => m.sender === 'user'));

      if (isInitialProblem) {
        const welcomeMsg = await aiService.startProblemSession(currentProblem);
        const updated = [welcomeMsg];
        setProblemMessages(updated);
        if (!isErrorMessage(welcomeMsg)) {
          persistProblemSession(updated);
          setLastFailedAction(null);
        } else {
          setLastFailedAction({ mode: 'problem', type: 'init_problem' });
        }
      } else if (isInitialConcept) {
        const msg = await aiService.explainConcept(currentConcept);
        const updated = [msg];
        setConceptMessages(updated);
        if (!isErrorMessage(msg)) {
          persistConceptSession(updated);
          setLastFailedAction(null);
        } else {
          setLastFailedAction({ mode: 'concept', type: 'init_concept' });
        }
      } else if (lastFailedAction?.type === 'chat_problem' && lastFailedAction.text) {
        const cleanHistory = problemMessages.filter(m => !isErrorMessage(m));
        setProblemMessages(cleanHistory);
        const response = await aiService.askProblemQuestion(
          currentProblem,
          currentStage,
          lastFailedAction.text,
          cleanHistory
        );
        const updated = appendMessageConsolidated(cleanHistory, response);
        setProblemMessages(updated);
        if (!isErrorMessage(response)) {
          persistProblemSession(updated);
          setLastFailedAction(null);
        }
      } else if (lastFailedAction?.type === 'chat_concept' && lastFailedAction.text) {
        const cleanHistory = conceptMessages.filter(m => !isErrorMessage(m));
        setConceptMessages(cleanHistory);
        const response = await aiService.explainConcept(currentConcept, lastFailedAction.text);
        const updated = appendMessageConsolidated(cleanHistory, response);
        setConceptMessages(updated);
        if (!isErrorMessage(response)) {
          persistConceptSession(updated);
          setLastFailedAction(null);
        }
      } else if (lastFailedAction?.type === 'hint' && lastFailedAction.hintLevel) {
        const cleanHistory = problemMessages.filter(m => !isErrorMessage(m));
        setProblemMessages(cleanHistory);
        const response = await aiService.requestHint(currentProblem, lastFailedAction.hintLevel, currentStage);
        const updated = appendMessageConsolidated(cleanHistory, response);
        setProblemMessages(updated);
        if (!isErrorMessage(response)) {
          persistProblemSession(updated, currentStage, lastFailedAction.hintLevel);
          setLastFailedAction(null);
        }
      } else if (lastFailedAction?.type === 'stage' && lastFailedAction.stage) {
        const cleanHistory = problemMessages.filter(m => !isErrorMessage(m));
        setProblemMessages(cleanHistory);
        const response = await aiService.advancePedagogyStage(currentProblem, lastFailedAction.stage);
        const updated = appendMessageConsolidated(cleanHistory, response);
        setProblemMessages(updated);
        if (!isErrorMessage(response)) {
          persistProblemSession(updated, lastFailedAction.stage, highestHintLevel);
          setLastFailedAction(null);
        }
      } else if (lastFailedAction?.type === 'code_analysis') {
        await handleTriggerAnalysis();
      } else {
        // Fallback: retry last user message
        const currentList = activeMode === 'problem' ? problemMessages : activeMode === 'concept' ? conceptMessages : codeMessages;
        const lastUser = [...currentList].reverse().find(m => m.sender === 'user');
        if (lastUser) {
          await handleSendMessage(lastUser.content);
        }
      }
    } catch (err) {
      console.error('Retry execution failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle action chip clicks with support for Retry, Settings, and Socratic Mock
  const handleActionChip = async (action: string) => {
    if (action === 'Retry Request' || action === 'Retry Connection') {
      await handleRetry();
      return;
    }

    if (action === 'Switch to Socratic Mock' || action === 'Switch to Mock (Dev Fallback)') {
      const mockSettings: AISettings = { ...settings, provider: 'mock' };
      onUpdateSettings?.(mockSettings);

      // Explicitly switch to Socratic Mock mentor without reloading
      const mockService = new MockAIService();
      setIsLoading(true);
      try {
        if (activeMode === 'problem') {
          const cleanHistory = problemMessages.filter(m => !isErrorMessage(m));
          const lastUser = [...cleanHistory].reverse().find(m => m.sender === 'user');
          if (lastUser) {
            const resp = await mockService.askProblemQuestion(currentProblem, currentStage, lastUser.content, cleanHistory);
            const updated = [...cleanHistory, resp];
            setProblemMessages(updated);
            persistProblemSession(updated);
          } else {
            const welcome = await mockService.startProblemSession(currentProblem);
            const updated = [welcome];
            setProblemMessages(updated);
            persistProblemSession(updated);
          }
        } else if (activeMode === 'concept') {
          const cleanHistory = conceptMessages.filter(m => !isErrorMessage(m));
          const lastUser = [...cleanHistory].reverse().find(m => m.sender === 'user');
          const resp = await mockService.explainConcept(currentConcept, lastUser?.content);
          const updated = [...cleanHistory, resp];
          setConceptMessages(updated);
          persistConceptSession(updated);
        }
        setLastFailedAction(null);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (action === 'Open Settings (⚙️)' || action === 'Open Settings') {
      onOpenSettings?.();
      return;
    }

    await handleSendMessage(action);
  };

  // Handle Progressive Hint Request
  const handleSelectHint = async (level: HintLevel) => {
    setIsLoading(true);
    setHighestHintLevel(level);

    recordLearningEvent({
      type: 'hint_requested',
      targetId: currentProblem.id,
      targetType: 'problem',
      metadata: { hintLevel: level }
    });
    onStatsUpdate?.();

    try {
      const hintMsg = await aiService.requestHint(currentProblem, level, currentStage);
      const cleanHistory = problemMessages.length > 0 && isErrorMessage(problemMessages[problemMessages.length - 1])
        ? problemMessages.slice(0, -1)
        : problemMessages;
      const updated = appendMessageConsolidated(cleanHistory, hintMsg);
      setProblemMessages(updated);
      if (isErrorMessage(hintMsg)) {
        setLastFailedAction({ mode: 'problem', type: 'hint', hintLevel: level });
      } else {
        persistProblemSession(updated, currentStage, level);
        setLastFailedAction(null);
      }
    } catch (e) {
      console.error(e);
      setLastFailedAction({ mode: 'problem', type: 'hint', hintLevel: level });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Pedagogy Stage Advancement
  const handleSelectStage = async (stage: PedagogyStage) => {
    setCurrentStage(stage);
    setIsLoading(true);

    recordLearningEvent({
      type: 'stage_advanced',
      targetId: currentProblem.id,
      targetType: 'problem',
      metadata: { stage }
    });
    onStatsUpdate?.();

    try {
      const stageMsg = await aiService.advancePedagogyStage(currentProblem, stage);
      const cleanHistory = problemMessages.length > 0 && isErrorMessage(problemMessages[problemMessages.length - 1])
        ? problemMessages.slice(0, -1)
        : problemMessages;
      const updated = appendMessageConsolidated(cleanHistory, stageMsg);
      setProblemMessages(updated);
      if (isErrorMessage(stageMsg)) {
        setLastFailedAction({ mode: 'problem', type: 'stage', stage });
      } else {
        persistProblemSession(updated, stage, highestHintLevel);
        setLastFailedAction(null);
      }
    } catch (e) {
      console.error(e);
      setLastFailedAction({ mode: 'problem', type: 'stage', stage });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Code Analysis Trigger
  const handleTriggerAnalysis = async () => {
    setIsAnalyzingCode(true);
    setIsLoading(true);

    recordLearningEvent({
      type: 'code_analyzed',
      targetId: currentProblem.id,
      targetType: 'code',
      metadata: { language: codeLanguage }
    });
    onStatsUpdate?.();

    try {
      const analysis = await aiService.analyzeCode(userCode, codeLanguage, activeProblemContext);
      setCodeAnalysis(analysis);

      const introMsg: ChatMessage = {
        id: `code-${Date.now()}`,
        sender: 'mentor',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `### 🔍 Code Analysis Completed!\n\n` +
          `• **Target Problem:** **${currentProblem.title}**\n` +
          `• **Estimated Time Complexity:** \`${analysis.timeComplexity}\`\n` +
          `• **Estimated Space Complexity:** \`${analysis.spaceComplexity}\`\n` +
          `• **Detected Pattern:** **${analysis.detectedPattern}**\n\n` +
          `**Bottleneck Observation:**\n${analysis.bottlenecks.join('\n')}\n\n` +
          `🌱 **Mentor Nudge:** ${analysis.progressiveHints.nudge}`,
        suggestedActions: [
          'How do I eliminate the nested loop?',
          'What is the optimal space complexity?',
          'Show progressive hint'
        ]
      };
      const cleanHistory = codeMessages.length > 0 && isErrorMessage(codeMessages[codeMessages.length - 1])
        ? codeMessages.slice(0, -1)
        : codeMessages;
      const updated = appendMessageConsolidated(cleanHistory, introMsg);
      setCodeMessages(updated);
      persistCodeSession(updated);
      setLastFailedAction(null);
    } catch (e) {
      console.error(e);
      setLastFailedAction({ mode: 'code', type: 'code_analysis' });
    } finally {
      setIsAnalyzingCode(false);
      setIsLoading(false);
    }
  };

  // Handle explicit problem completion contract
  const handleToggleComplete = () => {
    if (isProblemCompleted) {
      recordLearningEvent({
        type: 'problem_uncompleted',
        targetId: currentProblem.id,
        targetType: 'problem'
      });
      setIsProblemCompleted(false);
      persistProblemSession(problemMessages, currentStage, highestHintLevel, false);
      onStatsUpdate?.();
    } else {
      recordLearningEvent({
        type: 'problem_completed',
        targetId: currentProblem.id,
        targetType: 'problem',
        metadata: {
          selfReported: true,
          verification: 'self_reported',
          highestHintLevel,
          stageReached: currentStage
        }
      });
      setIsProblemCompleted(true);
      persistProblemSession(problemMessages, currentStage, highestHintLevel, true);
      onStatsUpdate?.();
    }
  };

  // Reset Session
  const handleResetSession = async () => {
    setLastFailedAction(null);
    setIsLoading(true);
    try {
      if (activeMode === 'problem') {
        deleteSavedSession(`session-problem-${currentProblem.id}`);
        const msg = await aiService.startProblemSession(currentProblem);
        const resetMsgs = [msg];
        setProblemMessages(resetMsgs);
        setCurrentStage('constraints');
        setHighestHintLevel(null);
        if (!isErrorMessage(msg)) {
          persistProblemSession(resetMsgs, 'constraints', null, isProblemCompleted);
        } else {
          setLastFailedAction({ mode: 'problem', type: 'init_problem' });
        }
      } else if (activeMode === 'concept') {
        deleteSavedSession(`session-concept-${currentConcept.id}`);
        const msg = await aiService.explainConcept(currentConcept);
        const resetMsgs = [msg];
        setConceptMessages(resetMsgs);
        if (!isErrorMessage(msg)) {
          persistConceptSession(resetMsgs);
        } else {
          setLastFailedAction({ mode: 'concept', type: 'init_concept' });
        }
      } else {
        deleteSavedSession(`session-code-${currentProblem.id}`);
        setCodeMessages([]);
        setCodeAnalysis(null);
      }
    } catch (err) {
      console.error('Reset session failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeMessages = 
    activeMode === 'problem' ? problemMessages :
    activeMode === 'concept' ? conceptMessages : codeMessages;

  return (
    <div className="flex-1 flex flex-col bg-[#090d16] text-slate-100 overflow-hidden">
      
      {/* Top Mode Selector Bar */}
      <div className="bg-[#0b0f19] border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
        
        {/* Mode Switch Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveMode('problem')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'problem'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Problem Mode</span>
          </button>

          <button
            onClick={() => setActiveMode('concept')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'concept'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Concept Mode</span>
          </button>

          <button
            onClick={() => setActiveMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'code'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code Mode</span>
          </button>
        </div>

        {/* Right Aux Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setContextCollapsed(!contextCollapsed)}
            className="md:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
            title={contextCollapsed ? 'Expand context pane' : 'Collapse context pane'}
          >
            {contextCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <button
            onClick={handleResetSession}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
            title="Restart session conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Session</span>
          </button>
        </div>

      </div>

      {/* Mode-Specific Sub-Bars: Pedagogy Stages & Hint Controls for Problem Mode */}
      {activeMode === 'problem' && (
        <>
          <PedagogyStageBar
            currentStage={currentStage}
            onSelectStage={handleSelectStage}
            disabled={isLoading}
          />
          <HintControls
            highestHintLevel={highestHintLevel}
            onSelectHint={handleSelectHint}
            disabled={isLoading}
          />
        </>
      )}

      {/* Split Dual-Pane Mentor Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT PANE: Context Area */}
        <div className={`w-full md:w-[48%] lg:w-[44%] border-r border-slate-800 flex flex-col overflow-hidden transition-all ${
          contextCollapsed ? 'hidden md:flex' : 'flex'
        }`}>
          {activeMode === 'problem' && (
            <ProblemContext
              currentProblem={currentProblem}
              allProblems={allProblems}
              onSelectProblem={onSelectProblem}
              onOpenNewProblem={onOpenNewProblem}
              isCompleted={isProblemCompleted}
              highestHintLevel={highestHintLevel}
              onToggleComplete={handleToggleComplete}
            />
          )}

          {activeMode === 'concept' && (
            <ConceptContext
              currentConcept={currentConcept}
              allConcepts={allConcepts}
              onSelectConcept={onSelectConcept}
              onUpdateStatus={onUpdateConceptStatus}
              allProblems={allProblems}
              onSelectProblem={(prob) => {
                onSelectProblem(prob);
                setActiveMode('problem');
              }}
            />
          )}

          {activeMode === 'code' && (
            <CodeContext
              userCode={userCode}
              onCodeChange={setUserCode}
              language={codeLanguage}
              onLanguageChange={setCodeLanguage}
              analysis={codeAnalysis}
              isAnalyzing={isAnalyzingCode}
              onTriggerAnalysis={handleTriggerAnalysis}
              onAskMentorAboutCode={handleSendMessage}
            />
          )}
        </div>

        {/* RIGHT PANE: Mentor Conversation Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <MentorChat
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            currentStage={currentStage}
            mode={activeMode}
            onSelectActionChip={handleActionChip}
          />
        </div>

      </div>

    </div>
  );
};
