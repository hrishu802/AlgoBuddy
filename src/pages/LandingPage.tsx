import { AppMode, AppView, UserStats, Problem, ProblemRecommendation, SpacedReviewRecord } from '../types';
import { PROBLEMS } from '../data/problems';
import { CONCEPTS } from '../data/concepts';
import { 
  BrainCircuit, 
  Compass, 
  BookOpen, 
  Code2, 
  ArrowRight, 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Boxes, 
  Zap, 
  Layers,
  ChevronRight,
  CalendarClock,
  RotateCcw
} from 'lucide-react';

interface LandingPageProps {
  onStartMode: (mode: AppMode, problemId?: string, conceptId?: string) => void;
  onNavigate: (view: AppView, mode?: AppMode) => void;
  stats: UserStats;
  recommendations?: ProblemRecommendation[];
  dueReviews?: { problem: Problem; review: SpacedReviewRecord; daysOverdue: number }[];
  onCompleteReview?: (problemId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartMode,
  onNavigate,
  stats,
  recommendations = [],
  dueReviews = [],
  onCompleteReview,
}) => {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 max-w-6xl mx-auto text-center space-y-6">
        
        {/* Hacktoberfest 2026 Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Hacktoberfest 2026 • Built for Serious Tech Interview Prep</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-3 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight font-sans">
            Don't just get the answer. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200">
              Learn how to find it.
            </span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            AlgoBuddy is your personal AI DSA mentor. Instead of dumping code solutions, it trains your brain to break down constraints, identify algorithmic patterns, and optimize step by step.
          </p>
        </div>

        {/* Core Teaching Philosophy Banner */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-300 font-mono">
          <span className="text-indigo-400 font-semibold">Our Philosophy:</span>
          <span>Think first.</span>
          <span className="text-slate-600">→</span>
          <span>Hint second.</span>
          <span className="text-slate-600">→</span>
          <span className="text-emerald-400 font-semibold">Solution last.</span>
        </div>

        {/* CTA Launch Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onStartMode('problem')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Compass className="w-4 h-4" />
            <span>Start Problem Mentoring</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('concepts')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition-all"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Explore 14 Concepts</span>
          </button>
        </div>

      </section>

      {/* Three Primary Mode Cards */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto w-full pb-16">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Three Modes Engineered for DSA Mastery
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Target the exact failure points you face during coding interview preparation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Mode 1: Problem Mode */}
          <div 
            onClick={() => onStartMode('problem')}
            className="group relative bg-[#0c1220] border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                  Mode 01
                </span>
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                  Solve a Problem
                </h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Paste any LeetCode problem. The AI guides you through 7 structured steps: Constraints → Brute Force → Pattern → Progressive Hints → Optimized Solution.
              </p>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>5-tier progressive hints (Nudge to Code)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pre-loaded top interview problems</span>
                </div>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Launch Problem Mode</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Mode 2: Concept Mode */}
          <div 
            onClick={() => onStartMode('concept')}
            className="group relative bg-[#0c1220] border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-purple-500/5 cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                  Mode 02
                </span>
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                  Learn a Concept
                </h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Never forget stacks, graphs, or DP. Review when to recognize them, common interview patterns, pitfalls, and test your understanding with practice checkpoints.
              </p>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>14 core DSA concepts covered</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Recognition triggers & trap avoidance</span>
                </div>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>Explore Concepts</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Mode 3: Code Mode */}
          <div 
            onClick={() => onStartMode('code')}
            className="group relative bg-[#0c1220] border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/5 cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Code2 className="w-6 h-6" />
              </div>
              
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  Mode 03
                </span>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Optimize My Code
                </h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Paste your solution. AlgoBuddy analyzes time/space complexity, pinpoints nested loops and bottlenecks, and gives hints to optimize before dumping full code.
              </p>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Big-O calculation & bottleneck spots</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Supports Python, JS, C++, Java</span>
                </div>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Optimize Solution</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>

        </div>
      </section>

      {/* Continue Learning & Recent Activity Section */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto w-full pb-16">
        <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Continue Learning
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>{stats.currentStreak}-day streak</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pick up where you left off or tackle your highest-priority recommended topics.
              </p>
            </div>

            <button
              onClick={() => onNavigate('progress')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View full progress</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Due for Spaced Review Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Due for Spaced Review
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                {dueReviews && dueReviews.length > 0 
                  ? `${dueReviews.length} problem${dueReviews.length === 1 ? '' : 's'} ready for review` 
                  : '1, 3, 7, 14, 30 day intervals'}
              </span>
            </div>

            {(!dueReviews || dueReviews.length === 0) ? (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-center space-y-1">
                <p className="text-slate-300 font-medium">No reviews due right now.</p>
                <p className="text-slate-500 text-[11px]">
                  Completed problems automatically enter the spaced review schedule (1d → 3d → 7d → 14d → 30d) to combat retention decay.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dueReviews.map(({ problem, review, daysOverdue }) => (
                  <div
                    key={problem.id}
                    className="bg-slate-900/60 border border-amber-500/30 hover:border-amber-500/60 p-4 rounded-xl transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-slate-100 truncate">
                          {problem.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {review.intervalDays}d review
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                          problem.difficulty === 'Easy' ? 'text-emerald-400 bg-emerald-500/10' :
                          problem.difficulty === 'Medium' ? 'text-amber-400 bg-amber-500/10' :
                          'text-rose-400 bg-rose-500/10'
                        }`}>
                          {problem.difficulty}
                        </span>
                        <span>•</span>
                        <span className="text-amber-400 font-medium">
                          {daysOverdue > 0 ? `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue` : 'Due today'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-snug">
                        Stage {review.stage + 1} review interval reached. Revisit the pattern without hints.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                      <button
                        onClick={() => onStartMode('problem', problem.id)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </button>
                      {onCompleteReview && (
                        <button
                          onClick={() => onCompleteReview(problem.id)}
                          title="Explicitly confirm completion of this spaced review (self-reported)"
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Next Practice Cards */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Recommended Next Practice
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Ranked by weakness & study evidence
              </span>
            </div>

            {recommendations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recommendations.map((rec) => {
                  const categoryBadge = 
                    rec.category === 'weak_topic' ? { label: 'Needs Practice', style: 'bg-rose-500/10 text-rose-300 border-rose-500/20' } :
                    rec.category === 'concept_bridge' ? { label: 'Concept Bridge', style: 'bg-purple-500/10 text-purple-300 border-purple-500/20' } :
                    rec.category === 'review' ? { label: 'Spaced Review', style: 'bg-amber-500/10 text-amber-300 border-amber-500/20' } :
                    { label: 'General Practice', style: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' };

                  return (
                    <div
                      key={rec.problemId}
                      onClick={() => onStartMode('problem', rec.problemId)}
                      className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:bg-slate-900 group flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                            {rec.problem.title}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono shrink-0 ${categoryBadge.style}`}>
                            {categoryBadge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                            rec.problem.difficulty === 'Easy' ? 'text-emerald-400 bg-emerald-500/10' :
                            rec.problem.difficulty === 'Medium' ? 'text-amber-400 bg-amber-500/10' :
                            'text-rose-400 bg-rose-500/10'
                          }`}>
                            {rec.problem.difficulty}
                          </span>
                          <span>•</span>
                          <span className="text-slate-400 truncate">
                            {rec.topic || rec.problem.tags[0] || rec.problem.category}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-snug line-clamp-2 pt-1">
                          {rec.reason}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 leading-tight">
                        Evidence: {rec.evidence}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : stats.recommendedNext.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {stats.recommendedNext.map((rec, i) => (
                  <div
                    key={i}
                    onClick={() => onStartMode(rec.mode, rec.id, rec.id)}
                    className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl cursor-pointer transition-all hover:bg-slate-900 group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                        {rec.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/60 border border-indigo-900 text-indigo-300 font-mono">
                        {rec.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                      {rec.reason}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-center">
                No recommended topics yet. Solve problems to receive personalized practice suggestions.
              </div>
            )}
          </div>

          {/* Recently Studied Timeline */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recent Activity
            </h4>
            {stats.recentlyStudied.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-center">
                No recent activity recorded. Launch Problem or Concept mode to begin!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {stats.recentlyStudied.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => onStartMode(item.type === 'problem' ? 'problem' : 'concept', item.id, item.id)}
                    className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 hover:bg-slate-900 text-xs cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                      <span className="capitalize">{item.type}</span>
                      <span>{item.date}</span>
                    </div>
                    <div className="font-medium text-slate-200 truncate">{item.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500 mt-auto">
        <p>AlgoBuddy — Built for Hacktoberfest 2026 "Build for a Friend" challenge.</p>
        <p className="text-[11px] text-slate-600 mt-1">
          "Think first. Hint second. Solution last." • React + Vite + Tailwind CSS
        </p>
      </footer>

    </div>
  );
};
