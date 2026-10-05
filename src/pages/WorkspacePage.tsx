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
import { AIService } from '../services/ai/aiService';
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
}) => {
  const [activeMode, setActiveMode] = useState<AppMode>(initialMode);
  const [currentStage, setCurrentStage] = useState<PedagogyStage>('constraints');
  const [highestHintLevel, setHighestHintLevel] = useState<HintLevel | null>(null);
  
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

  // Sync mode with props
  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  // Initialize Problem Session
  useEffect(() => {
    let isMounted = true;
    async function initProblem() {
      setIsLoading(true);
      try {
        const welcomeMsg = await aiService.startProblemSession(currentProblem);
        if (isMounted) {
          setProblemMessages([welcomeMsg]);
          setCurrentStage('constraints');
          setHighestHintLevel(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    initProblem();
    return () => { isMounted = false; };
  }, [currentProblem.id]);

  // Initialize Concept Session
  useEffect(() => {
    let isMounted = true;
    async function initConcept() {
      setIsLoading(true);
      try {
        const msg = await aiService.explainConcept(currentConcept);
        if (isMounted) {
          setConceptMessages([msg]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    initConcept();
    return () => { isMounted = false; };
  }, [currentConcept.id]);

  // Handle User Chat Message
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (activeMode === 'problem') {
      const nextHistory = [...problemMessages, userMsg];
      setProblemMessages(nextHistory);
      setIsLoading(true);
      try {
        const response = await aiService.askProblemQuestion(
          currentProblem,
          currentStage,
          text,
          nextHistory
        );
        setProblemMessages(prev => [...prev, response]);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    } else if (activeMode === 'concept') {
      const nextHistory = [...conceptMessages, userMsg];
      setConceptMessages(nextHistory);
      setIsLoading(true);
      try {
        const response = await aiService.explainConcept(currentConcept, text);
        setConceptMessages(prev => [...prev, response]);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    } else {
      const nextHistory = [...codeMessages, userMsg];
      setCodeMessages(nextHistory);
      setIsLoading(true);
      try {
        if (codeAnalysis) {
          const response = await aiService.askCodeQuestion(userCode, codeAnalysis, text, nextHistory);
          setCodeMessages(prev => [...prev, response]);
        } else {
          // Trigger analysis if not yet run
          const analysis = await aiService.analyzeCode(userCode, codeLanguage);
          setCodeAnalysis(analysis);
          const response = await aiService.askCodeQuestion(userCode, analysis, text, nextHistory);
          setCodeMessages(prev => [...prev, response]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle Progressive Hint Request
  const handleSelectHint = async (level: HintLevel) => {
    setIsLoading(true);
    setHighestHintLevel(level);

    try {
      const hintMsg = await aiService.requestHint(currentProblem, level, currentStage);
      setProblemMessages(prev => [...prev, hintMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Pedagogy Stage Advancement
  const handleSelectStage = async (stage: PedagogyStage) => {
    setCurrentStage(stage);
    setIsLoading(true);
    try {
      const stageMsg = await aiService.advancePedagogyStage(currentProblem, stage);
      setProblemMessages(prev => [...prev, stageMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Code Analysis Trigger
  const handleTriggerAnalysis = async () => {
    setIsAnalyzingCode(true);
    setIsLoading(true);
    try {
      const analysis = await aiService.analyzeCode(userCode, codeLanguage);
      setCodeAnalysis(analysis);

      const introMsg: ChatMessage = {
        id: `code-${Date.now()}`,
        sender: 'mentor',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `### 🔍 Code Analysis Completed!\n\n` +
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
      setCodeMessages(prev => [...prev, introMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingCode(false);
      setIsLoading(false);
    }
  };

  // Reset Session
  const handleResetSession = () => {
    if (activeMode === 'problem') {
      aiService.startProblemSession(currentProblem).then(msg => {
        setProblemMessages([msg]);
        setCurrentStage('constraints');
        setHighestHintLevel(null);
      });
    } else if (activeMode === 'concept') {
      aiService.explainConcept(currentConcept).then(msg => {
        setConceptMessages([msg]);
      });
    } else {
      setCodeMessages([]);
      setCodeAnalysis(null);
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
            />
          )}

          {activeMode === 'concept' && (
            <ConceptContext
              currentConcept={currentConcept}
              allConcepts={allConcepts}
              onSelectConcept={onSelectConcept}
              onUpdateStatus={onUpdateConceptStatus}
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
            onSelectActionChip={handleSendMessage}
          />
        </div>

      </div>

    </div>
  );
};
