import React, { useState } from 'react';
import { HintLevel } from '../types';
import { hintLevelToDepth } from '../services/analytics';
import { 
  Sprout, 
  Lightbulb, 
  Zap, 
  BookOpenCheck, 
  KeyRound, 
  AlertTriangle,
  Check,
  X
} from 'lucide-react';

interface HintControlsProps {
  highestHintLevel: HintLevel | null;
  onSelectHint: (level: HintLevel) => void;
  disabled?: boolean;
}

const HINT_TIERS: {
  level: HintLevel;
  title: string;
  badge: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    level: 'nudge',
    title: 'Nudge',
    badge: 'Level 1',
    desc: 'Subtle thought starter',
    icon: Sprout,
    color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30'
  },
  {
    level: 'hint',
    title: 'Hint',
    badge: 'Level 2',
    desc: 'Pattern & structure clue',
    icon: Lightbulb,
    color: 'from-amber-500/20 to-amber-600/10 text-amber-300 border-amber-500/30'
  },
  {
    level: 'strong_hint',
    title: 'Strong Hint',
    badge: 'Level 3',
    desc: 'Algorithmic invariant',
    icon: Zap,
    color: 'from-indigo-500/20 to-indigo-600/10 text-indigo-300 border-indigo-500/30'
  },
  {
    level: 'explain',
    title: 'Explain',
    badge: 'Level 4',
    desc: 'Step-by-step logic breakdown',
    icon: BookOpenCheck,
    color: 'from-blue-500/20 to-blue-600/10 text-blue-300 border-blue-500/30'
  },
  {
    level: 'solution',
    title: 'Show Solution',
    badge: 'Level 5',
    desc: 'Full commented code',
    icon: KeyRound,
    color: 'from-rose-500/20 to-rose-600/10 text-rose-300 border-rose-500/30'
  }
];

export const HintControls: React.FC<HintControlsProps> = ({
  highestHintLevel,
  onSelectHint,
  disabled = false,
}) => {
  const [showSolutionConfirm, setShowSolutionConfirm] = useState(false);

  const handleHintClick = (level: HintLevel) => {
    if (level === 'solution') {
      setShowSolutionConfirm(true);
    } else {
      onSelectHint(level);
    }
  };

  const handleConfirmSolution = () => {
    setShowSolutionConfirm(false);
    onSelectHint('solution');
  };

  return (
    <div className="bg-[#0b0f19] border-y border-slate-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">
            Progressive Hints:
          </span>
          <span className="text-[11px] text-slate-500 hidden md:inline">
            Request only the guidance you need
          </span>
        </div>

        {/* 5 Hint Tier Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
          {HINT_TIERS.map(tier => {
            const Icon = tier.icon;
            const targetDepth = hintLevelToDepth(tier.level) ?? 0;
            const currentDepth = hintLevelToDepth(highestHintLevel) ?? 0;
            const isUnlocked = highestHintLevel !== null && targetDepth <= currentDepth;
            const isCurrentHighest = tier.level === highestHintLevel;

            return (
              <button
                key={tier.level}
                disabled={disabled}
                onClick={() => handleHintClick(tier.level)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  tier.color
                } ${isCurrentHighest ? 'ring-1 ring-white/60 shadow-md scale-[1.02]' : isUnlocked ? 'opacity-90' : ''} hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-sm`}
                title={`${tier.title}: ${tier.desc}${isUnlocked ? ' (Unlocked)' : ''}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">{tier.title}</span>
                <span className={`text-[9px] uppercase px-1 py-0.2 rounded font-mono flex items-center gap-0.5 ${
                  isCurrentHighest
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                    : isUnlocked
                    ? 'bg-black/60 text-emerald-300'
                    : 'bg-black/40 text-slate-300'
                } ml-0.5`}>
                  {isUnlocked && <Check className="w-2.5 h-2.5" />}
                  <span>{tier.badge}</span>
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Confirmation Modal for Solution */}
      {showSolutionConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowSolutionConfirm(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-base font-semibold text-slate-100 mb-1">
              Reveal the full reference solution?
            </h3>
            
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Remember AlgoBuddy's core promise: <br />
              <strong className="text-indigo-400">"Don't just get the answer. Learn how to find it."</strong>
            </p>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              In real technical interviews, you must construct the solution organically. Have you already attempted a <strong>Nudge</strong>, <strong>Strong Hint</strong>, or <strong>Explain</strong>?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowSolutionConfirm(false);
                  onSelectHint('strong_hint');
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium hover:bg-indigo-600/30"
              >
                Try Strong Hint First
              </button>
              <button
                onClick={handleConfirmSolution}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-500 shadow-sm shadow-rose-600/20"
              >
                Show Solution Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
