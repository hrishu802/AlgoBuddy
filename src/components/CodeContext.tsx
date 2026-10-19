import React, { useState } from 'react';
import { CodeAnalysis } from '../types';
import { 
  Play, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  HardDrive, 
  Zap, 
  ChevronDown, 
  Copy, 
  Check,
  FileCode2,
  ListTree
} from 'lucide-react';

interface CodeContextProps {
  userCode: string;
  onCodeChange: (code: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  analysis: CodeAnalysis | null;
  isAnalyzing: boolean;
  onTriggerAnalysis: () => void;
  onAskMentorAboutCode: (topic: string) => void;
}

const SAMPLE_SNIPPETS: Record<string, { label: string; lang: string; code: string }> = {
  bruteforce_twosum: {
    label: 'Brute Force Two Sum (O(N²))',
    lang: 'python',
    code: `def two_sum(nums, target):
    # Brute force search
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`
  },
  nested_duplicates: {
    label: 'Quadratic Duplicate Check (O(N²))',
    lang: 'python',
    code: `def contains_duplicate(nums):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False`
  },
  recursive_fib: {
    label: 'Naive Fibonacci (O(2^N))',
    lang: 'python',
    code: `def fib(n):
    # Exponential recursive calls
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)`
  }
};

export const CodeContext: React.FC<CodeContextProps> = ({
  userCode,
  onCodeChange,
  language,
  onLanguageChange,
  analysis,
  isAnalyzing,
  onTriggerAnalysis,
  onAskMentorAboutCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [showOptimizedCode, setShowOptimizedCode] = useState(false);

  const lineCount = Math.max(userCode.split('\n').length, 8);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const loadSample = (key: keyof typeof SAMPLE_SNIPPETS) => {
    const s = SAMPLE_SNIPPETS[key];
    onLanguageChange(s.lang);
    onCodeChange(s.code);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] text-slate-200 overflow-hidden">
      
      {/* Top Controls Toolbar */}
      <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-slate-900/60">
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>

          {/* Quick sample loader dropdown */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
            <span>Sample:</span>
            <button
              onClick={() => loadSample('bruteforce_twosum')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Two Sum O(N²)
            </button>
            <button
              onClick={() => loadSample('recursive_fib')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Fib O(2^N)
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onTriggerAnalysis}
          disabled={isAnalyzing || !userCode.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 transition-all"
        >
          {isAnalyzing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              <span>Analyze with Mentor</span>
            </>
          )}
        </button>
      </div>

      {/* Main Split: Code Editor Top, Analysis Bottom */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        
        {/* Code Editor Area */}
        <div className="relative flex-1 min-h-[200px] max-h-[360px] bg-[#070b13] border-b border-slate-800 flex">
          {/* Line Numbers Gutter */}
          <div className="w-10 py-3 pr-2 select-none text-right font-mono text-xs text-slate-600 border-r border-slate-800/80 bg-[#060910]">
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i} className="leading-5">{i + 1}</div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={userCode}
            aria-label="DSA Code Editor"
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="// Paste your DSA code here to check correctness, complexity, and optimizations..."
            className="flex-1 p-3 bg-transparent text-slate-200 font-mono text-xs leading-5 resize-none focus:outline-none placeholder-slate-600 selection:bg-indigo-500/30"
            spellCheck={false}
          />
        </div>

        {/* Analysis Section */}
        {analysis ? (
          <div className="p-4 space-y-4 bg-[#0a0e17]">
            
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ListTree className="w-3.5 h-3.5 text-indigo-400" />
                Mentor Code Analysis
              </h4>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                analysis.correctness === 'Looks Correct'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {analysis.correctness}
              </span>
            </div>

            {/* Time & Space Complexity Badges */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Estimated Time</div>
                  <div className="font-mono text-xs font-semibold text-indigo-300">{analysis.timeComplexity}</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Estimated Space</div>
                  <div className="font-mono text-xs font-semibold text-emerald-300">{analysis.spaceComplexity}</div>
                </div>
              </div>
            </div>

            {/* Pattern Detected */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-400">Detected Pattern:</span>
              <span className="font-semibold text-slate-200">{analysis.detectedPattern}</span>
            </div>

            {/* Bottlenecks Identified */}
            <div>
              <h5 className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Bottlenecks Identified
              </h5>
              <div className="space-y-1">
                {analysis.bottlenecks.map((b, i) => (
                  <div key={i} className="text-xs text-slate-300 p-2 rounded bg-amber-950/20 border border-amber-900/30 flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimization Opportunities */}
            <div>
              <h5 className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1.5 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Optimization Opportunities
              </h5>
              <div className="space-y-1">
                {analysis.optimizationOpportunities.map((op, i) => (
                  <div key={i} className="text-xs text-slate-300 p-2 rounded bg-indigo-950/20 border border-indigo-900/30 flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{op}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progressive Optimization Hint */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-300">🌱 Optimization Nudge:</span>
                <button
                  onClick={() => onAskMentorAboutCode(analysis.progressiveHints.hint)}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Discuss with Mentor →
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{analysis.progressiveHints.nudge}"
              </p>
            </div>

            {/* Reveal Optimized Code (Optional) */}
            {analysis.optimizedCode && (
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowOptimizedCode(!showOptimizedCode)}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-slate-300 bg-slate-900/60 hover:bg-slate-900 text-left transition-colors"
                >
                  <span>{showOptimizedCode ? 'Hide Optimized Code' : 'Reveal Optimized Reference'}</span>
                  <span className="text-[10px] text-indigo-400">{showOptimizedCode ? '▲' : '▼'}</span>
                </button>

                {showOptimizedCode && (
                  <div className="p-3 bg-[#060910] border-t border-slate-800 space-y-2">
                    <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto">
                      <code>{analysis.optimizedCode.code}</code>
                    </pre>
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      {analysis.optimizedCode.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 text-xs space-y-2">
            <FileCode2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p>Paste your solution above and click <strong>"Analyze with Mentor"</strong></p>
            <p className="text-[11px] text-slate-600">
              AlgoBuddy checks Big-O complexity, spots quadratic loops, and suggests pattern improvements without spoiling the solution immediately.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
