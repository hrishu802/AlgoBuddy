import React from 'react';
import { UserStats, AppMode } from '../types';
import { 
  BarChart3, 
  Flame, 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Compass, 
  ArrowRight, 
  Clock, 
  Sparkles,
  TrendingUp,
  Brain
} from 'lucide-react';

interface ProgressPageProps {
  stats: UserStats;
  onNavigateToTopic: (mode: AppMode, problemId?: string, conceptId?: string) => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  stats,
  onNavigateToTopic,
}) => {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
      
      {/* Page Title & Philosophy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Interview Readiness Dashboard
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track problem mastery, diagnose pattern weaknesses, and monitor your independence from hints.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Streak: <strong className="text-amber-300">{stats.currentStreak} Days</strong></span>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Problems Practiced */}
        <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Problems Practiced</span>
            <Compass className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {stats.problemsPracticed}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span className="text-emerald-400">6 Easy</span>
            <span>•</span>
            <span className="text-amber-400">9 Med</span>
            <span>•</span>
            <span className="text-rose-400">3 Hard</span>
          </div>
        </div>

        {/* Card 2: Concepts Reviewed */}
        <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Concepts Covered</span>
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {stats.conceptsReviewed} <span className="text-sm font-normal text-slate-500">/ 14</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-purple-500 h-full rounded-full transition-all"
              style={{ width: `${(stats.conceptsReviewed / 14) * 100}%` }}
            />
          </div>
        </div>

        {/* Card 3: Learning Streak */}
        <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Streak</span>
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400/20" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-300 font-mono">
            {stats.currentStreak} <span className="text-sm font-normal text-slate-500">Days</span>
          </div>
          <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            Consecutive daily problem solving
          </p>
        </div>

        {/* Card 4: Hint Reliance */}
        <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Hint Reliance</span>
            <Brain className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
            Lvl 1.8
          </div>
          <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            Average hint depth before solving (Trending down ↓)
          </p>
        </div>

      </div>

      {/* Weak Areas Section (Crucial requirement) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Diagnostic Weak Areas
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Identified from your recent mentor sessions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.weakAreas.map((area, idx) => (
            <div
              key={idx}
              className="bg-[#0c1220] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border tracking-wider ${
                    area.urgency === 'High'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {area.urgency} Urgency
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100">
                  {area.topic}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {area.reason}
                </p>
              </div>

              <button
                onClick={() => onNavigateToTopic('problem')}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-indigo-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Target in Practice</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Recommended Topics & Recently Studied */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recommended Next Topics */}
        <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Recommended Next Topics</span>
            </h3>
            <span className="text-[11px] text-slate-500">Based on weak areas</span>
          </div>

          <div className="space-y-3">
            {stats.recommendedNext.map((rec, i) => (
              <div
                key={i}
                onClick={() => onNavigateToTopic(rec.mode, rec.id, rec.id)}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all hover:bg-slate-900 group"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {rec.name}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-900 text-indigo-300 font-mono">
                    {rec.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-snug">
                  {rec.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Studied Timeline */}
        <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Recently Studied</span>
            </h3>
            <span className="text-[11px] text-slate-500">History</span>
          </div>

          <div className="space-y-2.5">
            {stats.recentlyStudied.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onNavigateToTopic(item.type === 'problem' ? 'problem' : 'concept', item.id, item.id)}
                className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:bg-slate-900 text-xs flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div>
                    <div className="font-medium text-slate-200">{item.name}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{item.type} • {item.difficulty}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {item.date}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
