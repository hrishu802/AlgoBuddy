import React from 'react';
import { 
  AppView, 
  AppMode, 
  UserStats, 
  AISettings 
} from '../types';
import { 
  Flame, 
  Cpu, 
  Settings, 
  PlusCircle, 
  BookOpen, 
  BarChart3, 
  Code2, 
  BrainCircuit,
  Compass
} from 'lucide-react';

interface NavbarProps {
  currentView: AppView;
  currentMode: AppMode;
  onNavigate: (view: AppView, mode?: AppMode) => void;
  stats: UserStats;
  settings: AISettings;
  onOpenSettings: () => void;
  onOpenNewProblem: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  currentMode,
  onNavigate,
  stats,
  settings,
  onOpenSettings,
  onOpenNewProblem,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div 
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-base tracking-tight font-sans">
                AlgoBuddy
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Mentor
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              DSA Problem-Solving Mentor
            </p>
          </div>
        </div>

        {/* Center Nav Views */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('home')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              currentView === 'home'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => onNavigate('workspace', currentMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              currentView === 'workspace'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Workspace</span>
            <span className="hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 text-slate-300">
              {currentMode === 'problem' ? 'Problem' : currentMode === 'concept' ? 'Concept' : 'Code'}
            </span>
          </button>

          <button
            onClick={() => onNavigate('concepts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              currentView === 'concepts'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Concept</span> Library
          </button>

          <button
            onClick={() => onNavigate('progress')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              currentView === 'progress'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Progress</span>
          </button>
        </nav>

        {/* Right Tools & Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak indicator */}
          <div 
            onClick={() => onNavigate('progress')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium cursor-pointer hover:bg-amber-500/20 transition-colors"
            title={`${stats.currentStreak}-day learning streak`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
            <span className="font-semibold">{stats.currentStreak}d</span>
          </div>

          {/* Paste / New Problem CTA */}
          <button
            onClick={onOpenNewProblem}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Paste Problem</span>
          </button>

          {/* AI Provider Indicator & Settings */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs transition-colors"
            title="Configure AI Mentor Provider & Settings"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline font-mono text-[11px] text-slate-300">
              {settings.provider === 'gemma' 
                ? 'Gemma 3 (HF Hosted)' 
                : settings.provider === 'gemini' 
                ? 'Gemini Cloud' 
                : 'Socratic Mock (Dev Fallback)'}
            </span>

            <Settings className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
