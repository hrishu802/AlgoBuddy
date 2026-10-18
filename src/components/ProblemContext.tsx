import React, { useState } from 'react';
import { Problem, HintLevel } from '../types';
import { ComplexityBadge } from './ComplexityBadge';
import { hintLevelToDepth } from '../services/analytics';
import { 
  ChevronDown, 
  Plus, 
  Copy, 
  Check, 
  Code2, 
  Layers, 
  Sparkles,
  Info,
  Scale,
  CheckCircle2,
  CheckCheck,
  RotateCcw,
  X
} from 'lucide-react';

interface ProblemContextProps {
  currentProblem: Problem;
  allProblems: Problem[];
  onSelectProblem: (problem: Problem) => void;
  onOpenNewProblem: () => void;
  isCompleted?: boolean;
  highestHintLevel?: HintLevel | null;
  onToggleComplete?: () => void;
}

export const ProblemContext: React.FC<ProblemContextProps> = ({
  currentProblem,
  allProblems,
  onSelectProblem,
  onOpenNewProblem,
  isCompleted = false,
  highestHintLevel = null,
  onToggleComplete,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showStarterCode, setShowStarterCode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'python' | 'javascript' | 'cpp' | 'java'>('python');
  const [showBruteForce, setShowBruteForce] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Hard':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] text-slate-200 overflow-hidden">
      
      {/* Top Header / Selector */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 text-left transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-100 text-sm truncate">
                {currentProblem.title}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${getDifficultyColor(currentProblem.difficulty)}`}>
                {currentProblem.difficulty}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#0f172a] border border-slate-700 rounded-xl shadow-xl max-h-72 overflow-y-auto p-1.5 animate-in fade-in duration-150">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                <span>Select Problem</span>
                <span className="text-[10px] text-slate-500">{allProblems.length} available</span>
              </div>
              {allProblems.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProblem(p);
                    setShowDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                    p.id === currentProblem.id
                      ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{p.title}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ml-2 ${getDifficultyColor(p.difficulty)}`}>
                    {p.difficulty}
                  </span>
                </button>
              ))}
              <div className="border-t border-slate-800 mt-1 pt-1">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onOpenNewProblem();
                  }}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-indigo-400 hover:bg-indigo-950/40 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Paste Custom Problem</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onOpenNewProblem}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-300 shrink-0 transition-colors"
          title="Paste any LeetCode problem"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Paste</span>
        </button>
      </div>

      {/* Explicit Problem Completion Control */}
      {onToggleComplete && (
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Status:</span>
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <CheckCheck className="w-3 h-3" />
                <span>Solved (Self-reported)</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium">Unsolved</span>
            )}
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              isCompleted
                ? 'bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
            }`}
            title={isCompleted ? 'Click to undo self-reported completion' : 'Confirm problem completion'}
          >
            {isCompleted ? (
              <>
                <RotateCcw className="w-3 h-3" />
                <span>Undo Solved</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark as Solved</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Scrollable Context Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* Tags & Complexity Meta */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 font-medium">
              {currentProblem.category}
            </span>
            {currentProblem.tags.map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                {tag}
              </span>
            ))}
          </div>

          <ComplexityBadge
            time={currentProblem.optimalComplexity.time}
            space={currentProblem.optimalComplexity.space}
          />
        </div>

        {/* Problem Description */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            Description
          </h4>
          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/40 p-3 rounded-lg border border-slate-800/60 font-sans">
            {currentProblem.description}
          </div>
        </div>

        {/* Examples */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Examples
          </h4>
          <div className="space-y-2.5">
            {currentProblem.examples.map((ex, idx) => (
              <div 
                key={idx} 
                className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1 relative group"
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                  <span className="font-semibold text-slate-300">Example {idx + 1}</span>
                  <button
                    onClick={() => handleCopy(`Input: ${ex.input}\nOutput: ${ex.output}`, idx)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
                    title="Copy Example"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="font-mono text-[11px] space-y-0.5">
                  <p className="text-slate-300">
                    <span className="text-slate-500">Input:</span> {ex.input}
                  </p>
                  <p className="text-emerald-400">
                    <span className="text-slate-500">Output:</span> {ex.output}
                  </p>
                  {ex.explanation && (
                    <p className="text-slate-400 italic text-[11px] pt-1">
                      <span className="text-slate-500 not-italic">Explanation:</span> {ex.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            Constraints
          </h4>
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-3 space-y-1.5">
            {currentProblem.constraints.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs font-mono text-slate-300">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Collapsible Brute Force Baseline Card */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30">
          <button
            onClick={() => setShowBruteForce(!showBruteForce)}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-300 hover:bg-slate-800/40 text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Brute Force Baseline Comparison</span>
            </div>
            <span className="text-[11px] text-indigo-400 hover:underline">
              {showBruteForce ? 'Hide' : 'Inspect'}
            </span>
          </button>
          
          {showBruteForce && (
            <div className="p-3 border-t border-slate-800 text-xs space-y-2 bg-[#090d16]">
              <p className="text-slate-300 leading-relaxed">
                {currentProblem.bruteForce.approach}
              </p>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-rose-400">Brute Time: {currentProblem.bruteForce.time}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">Brute Space: {currentProblem.bruteForce.space}</span>
              </div>
            </div>
          )}
        </div>

        {/* Starter Code Viewer Toggle */}
        {currentProblem.starterCode && (
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30">
            <button
              onClick={() => setShowStarterCode(!showStarterCode)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-300 hover:bg-slate-800/40 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>Problem Starter Code</span>
              </div>
              <span className="text-[11px] text-emerald-400 hover:underline">
                {showStarterCode ? 'Hide' : 'View Templates'}
              </span>
            </button>

            {showStarterCode && (
              <div className="p-3 border-t border-slate-800 space-y-2 bg-[#080c14]">
                <div className="flex items-center gap-1">
                  {(['python', 'javascript', 'cpp', 'java'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-2 py-1 rounded text-[11px] font-mono capitalize ${
                        selectedLanguage === lang
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <pre className="p-3 rounded-md bg-[#05080e] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  <code>{currentProblem.starterCode[selectedLanguage]}</code>
                </pre>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Accessible Confirmation Modal */}
      {showConfirmModal && onToggleComplete && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 id="completion-dialog-title" className="text-base font-bold text-white flex items-center gap-2">
                {isCompleted ? (
                  <>
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>Undo Problem Completion</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Confirm Problem Completion</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              {isCompleted ? (
                <p>
                  Remove <strong>{currentProblem.title}</strong> from your completed problem records? Your problem count and analytics will be updated.
                </p>
              ) : (
                <>
                  <p>
                    Confirm that you solved or fully understood <strong>{currentProblem.title}</strong>?
                  </p>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 font-mono text-[11px]">
                    <div className="text-slate-400">
                      Recorded Hint Guidance:
                    </div>
                    <div className="text-amber-300 font-semibold">
                      {highestHintLevel 
                        ? `Highest tier requested: Level ${hintLevelToDepth(highestHintLevel)} (${highestHintLevel})` 
                        : 'Independent solve (No hints requested)'}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    * Note: Recorded as self-reported completion. AlgoBuddy does not run automated test-case execution to objectively verify correctness.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  onToggleComplete();
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all ${
                  isCompleted
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {isCompleted ? 'Confirm Undo' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
