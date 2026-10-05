import React from 'react';
import { PedagogyStage } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  HelpCircle, 
  ChevronRight,
  ShieldAlert,
  Boxes,
  Sparkles,
  Lightbulb,
  Gauge,
  CheckCheck
} from 'lucide-react';

interface PedagogyStageBarProps {
  currentStage: PedagogyStage;
  onSelectStage: (stage: PedagogyStage) => void;
}

const STAGES: { id: PedagogyStage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'constraints', label: '1. Constraints', icon: ShieldAlert },
  { id: 'bruteforce', label: '2. Brute Force', icon: Boxes },
  { id: 'pattern', label: '3. Pattern', icon: Sparkles },
  { id: 'hints', label: '4. Progressive Hints', icon: Lightbulb },
  { id: 'optimize', label: '5. Optimize', icon: HelpCircle },
  { id: 'complexity', label: '6. Complexity', icon: Gauge },
  { id: 'solution', label: '7. Solution', icon: CheckCheck },
];

export const PedagogyStageBar: React.FC<PedagogyStageBarProps> = ({
  currentStage,
  onSelectStage,
}) => {
  const currentIndex = STAGES.findIndex(s => s.id === currentStage);

  return (
    <div className="w-full bg-[#0c1220] border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
        
        {/* Core Teaching Philosophy Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Teaching Flow
          </span>
          <span className="text-slate-400 font-medium hidden sm:inline italic">
            "Think first. Hint second. Solution last."
          </span>
        </div>

        {/* Horizontal Flow Steps */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const Icon = stage.icon;

            return (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => onSelectStage(stage.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/50'
                      : isCompleted
                      ? 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800 border border-emerald-500/20'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-slate-800/60'
                  }`}
                  title={`Step ${idx + 1}: ${stage.label}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Icon className="w-3.5 h-3.5 text-indigo-200 shrink-0 animate-pulse" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span>{stage.label}</span>
                </button>

                {idx < STAGES.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

      </div>
    </div>
  );
};
