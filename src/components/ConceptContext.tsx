import React, { useState, useEffect } from 'react';
import { Concept, ConceptStatus, Problem } from '../types';
import { recordLearningEvent } from '../services/storage';
import { getConceptProblemBridge } from '../services/recommendations';
import { 
  ChevronDown, 
  Search, 
  HelpCircle, 
  Code, 
  AlertOctagon, 
  TrendingUp, 
  CheckCircle2, 
  XCircle,
  Lightbulb,
  Radar,
  ArrowRight
} from 'lucide-react';

interface ConceptContextProps {
  currentConcept: Concept;
  allConcepts: Concept[];
  onSelectConcept: (concept: Concept) => void;
  onUpdateStatus?: (conceptId: string, status: ConceptStatus) => void;
  allProblems?: Problem[];
  onSelectProblem?: (problem: Problem) => void;
}

export const ConceptContext: React.FC<ConceptContextProps> = ({
  currentConcept,
  allConcepts = [],
  onSelectConcept,
  onUpdateStatus,
  allProblems = [],
  onSelectProblem,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'pitfalls' | 'quiz'>('overview');
  
  // Interactive Quiz state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submittedQuiz, setSubmittedQuiz] = useState(false);

  // Reset interactive quiz when switching to a different concept
  useEffect(() => {
    setSelectedOption(null);
    setSubmittedQuiz(false);
  }, [currentConcept.id]);

  const bridgeProblem = getConceptProblemBridge(currentConcept.id, allProblems);

  const filteredConcepts = allConcepts.filter(c =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleOptionSelect = (index: number) => {
    if (!submittedQuiz) {
      setSelectedOption(index);
    }
  };

  const handleCheckQuiz = () => {
    if (selectedOption !== null) {
      setSubmittedQuiz(true);
      const isCorrect = selectedOption === currentConcept.practiceQuestion.answerIndex;
      recordLearningEvent({
        type: 'quiz_attempted',
        targetId: currentConcept.id,
        targetType: 'concept',
        metadata: {
          quizCorrect: isCorrect,
          selectedOption
        }
      });
      if (isCorrect && onUpdateStatus) {
        onUpdateStatus(currentConcept.id, 'Mastered');
      }
    }
  };

  const handleResetQuiz = () => {
    setSelectedOption(null);
    setSubmittedQuiz(false);
  };

  const getStatusBadge = (status: ConceptStatus) => {
    switch (status) {
      case 'Mastered':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'In Progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Needs Review':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] text-slate-200 overflow-hidden">
      
      {/* Top Header / Concept Selector */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 text-left transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-100 text-sm truncate">
                {currentConcept.name}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 uppercase tracking-wider shrink-0">
                {currentConcept.difficulty}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#0f172a] border border-slate-700 rounded-xl shadow-xl max-h-80 overflow-hidden flex flex-col p-1.5 animate-in fade-in duration-150">
              <div className="p-2 border-b border-slate-800">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search 14 DSA concepts..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-60 p-1 space-y-0.5">
                {filteredConcepts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectConcept(c);
                      setShowDropdown(false);
                      handleResetQuiz();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                      c.id === currentConcept.id
                        ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.category}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded border ${getStatusBadge(c.status)}`}>
                      {c.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`px-2.5 py-1 rounded-lg border text-xs font-medium shrink-0 ${getStatusBadge(currentConcept.status)}`}>
          {currentConcept.status}
        </div>
      </div>

      {/* Concept Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 px-3 pt-2 gap-1 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radar className="w-3.5 h-3.5" />
          <span>Overview & Triggers</span>
        </button>

        <button
          onClick={() => setActiveTab('patterns')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'patterns'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Patterns & Code</span>
        </button>

        <button
          onClick={() => setActiveTab('pitfalls')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'pitfalls'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Complexity & Traps</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'quiz'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Practice Quiz</span>
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* TAB 1: OVERVIEW & RECOGNITION */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                What is {currentConcept.name}?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                {currentConcept.whatItIs}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                <Radar className="w-3.5 h-3.5" />
                When to Recognize in Interview Problems
              </h4>
              <div className="space-y-1.5">
                {currentConcept.whenToRecognize.map((trigger, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-indigo-950/20 border border-indigo-900/40 text-xs text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <span>{trigger}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/30 border border-slate-800 p-3 rounded-lg text-xs space-y-1">
              <span className="font-semibold text-slate-400 uppercase text-[10px]">Category:</span>
              <p className="text-slate-300">{currentConcept.category} • {currentConcept.shortDescription}</p>
            </div>

            {bridgeProblem && (
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                    Concept Practice Bridge
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {bridgeProblem.difficulty}
                  </span>
                </div>
                <div className="text-xs font-semibold text-white">
                  {bridgeProblem.title}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Apply {currentConcept.name} algorithmic patterns to an actual LeetCode-style problem.
                </p>
                {onSelectProblem && (
                  <button
                    onClick={() => onSelectProblem(bridgeProblem)}
                    className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Practice in Problem Mode</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COMMON PATTERNS & CODE EXAMPLE */}
        {activeTab === 'patterns' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Common Interview Patterns
              </h4>
              <div className="space-y-2">
                {currentConcept.commonPatterns.map((pat, idx) => (
                  <div key={idx} className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg space-y-1">
                    <div className="font-semibold text-indigo-300 text-xs">
                      {pat.name}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {pat.description}
                    </p>
                    <div className="text-[11px] text-slate-500 pt-1 font-mono">
                      Example problems: {pat.problemExample}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Walkthrough Example: {currentConcept.simpleExample.problem}
              </h4>
              <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                {currentConcept.simpleExample.explanation}
              </p>
              <pre className="p-3 rounded-lg bg-[#070b12] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                <code>{currentConcept.simpleExample.codeSnippet}</code>
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: COMPLEXITY & PITFALLS */}
        {activeTab === 'pitfalls' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Complexity Trade-offs
              </h4>
              <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Time:</span>
                  <span className="font-mono text-indigo-300">{currentConcept.complexityTradeoffs.time}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">Space:</span>
                  <span className="font-mono text-emerald-300">{currentConcept.complexityTradeoffs.space}</span>
                </div>
                {currentConcept.complexityTradeoffs.notes && (
                  <div className="text-slate-400 pt-1 border-t border-slate-800/80 text-[11px]">
                    💡 {currentConcept.complexityTradeoffs.notes}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" />
                Common Traps & Mistakes
              </h4>
              <div className="space-y-2">
                {currentConcept.commonMistakes.map((mistake, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200/90 leading-relaxed">
                    <span className="text-amber-400 font-bold shrink-0">⚠️</span>
                    <span>{mistake}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRACTICE QUIZ */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                <HelpCircle className="w-4 h-4" />
                <span>Concept Checkpoint</span>
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
                {currentConcept.practiceQuestion.question}
              </h3>

              <div className="space-y-2 pt-1">
                {currentConcept.practiceQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentConcept.practiceQuestion.answerIndex;

                  let optionStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';

                  if (submittedQuiz) {
                    if (isCorrect) {
                      optionStyle = 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 font-medium';
                    } else if (isSelected && !isCorrect) {
                      optionStyle = 'bg-rose-950/30 border-rose-500/50 text-rose-300';
                    } else {
                      optionStyle = 'bg-slate-900/40 border-slate-800/40 text-slate-500';
                    }
                  } else if (isSelected) {
                    optionStyle = 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-medium';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(idx)}
                      disabled={submittedQuiz}
                      aria-label={`Option ${String.fromCharCode(65 + idx)}: ${opt}`}
                      aria-pressed={isSelected}
                      className={`w-full p-3 rounded-lg border text-left text-xs transition-colors flex items-start gap-2.5 ${optionStyle}`}
                    >
                      <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1 leading-relaxed">{opt}</span>
                      {submittedQuiz && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {submittedQuiz && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {!submittedQuiz ? (
                <button
                  onClick={handleCheckQuiz}
                  disabled={selectedOption === null}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors mt-2"
                >
                  Verify Answer
                </button>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                    selectedOption === currentConcept.practiceQuestion.answerIndex
                      ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/30 border border-rose-500/30 text-rose-200'
                  }`}>
                    <p className="font-semibold mb-1">
                      {selectedOption === currentConcept.practiceQuestion.answerIndex
                        ? '🎉 Correct!'
                        : '❌ Incorrect'}
                    </p>
                    <p className="text-slate-300">
                      {currentConcept.practiceQuestion.explanation}
                    </p>
                  </div>
                  <button
                    onClick={handleResetQuiz}
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Try Question Again
                  </button>

                  {bridgeProblem && (
                    <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-800/40 space-y-2 mt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                          Recommended Practice Problem
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {bridgeProblem.difficulty}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white">
                        {bridgeProblem.title}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {selectedOption === currentConcept.practiceQuestion.answerIndex
                          ? "Great job on the quiz checkpoint! Solidify your mastery by implementing the full algorithm hands-on (checkpoint recall alone does not equate to complete mastery)."
                          : "Reinforce what you've learned through hands-on implementation to address any conceptual gaps."}
                      </p>
                      {onSelectProblem && (
                        <button
                          onClick={() => onSelectProblem(bridgeProblem)}
                          className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Solve {bridgeProblem.title}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
