import { UserStats, AppMode, Problem, ProblemRecommendation, SpacedReviewRecord } from '../types';
import { evaluateReviewDueStatus } from '../services/recommendations';
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
  Brain,
  CalendarClock,
  RotateCcw
} from 'lucide-react';

interface ProgressPageProps {
  stats: UserStats;
  totalConcepts?: number;
  onNavigateToTopic: (mode: AppMode, problemId?: string, conceptId?: string) => void;
  recommendations?: ProblemRecommendation[];
  reviews?: Map<string, SpacedReviewRecord>;
  allProblems?: Problem[];
  onCompleteReview?: (problemId: string) => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  stats,
  totalConcepts = 14,
  onNavigateToTopic,
  recommendations = [],
  reviews,
  allProblems = [],
  onCompleteReview,
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
            <span>Problems Completed</span>
            <Compass className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {stats.problemsPracticed}
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              (Self-reported)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            {stats.problemsPracticed > 0 ? (
              <>
                <span className="text-emerald-400 font-medium">{stats.difficultyBreakdown?.easy ?? 0} Easy</span>
                <span>•</span>
                <span className="text-amber-400 font-medium">{stats.difficultyBreakdown?.medium ?? 0} Med</span>
                <span>•</span>
                <span className="text-rose-400 font-medium">{stats.difficultyBreakdown?.hard ?? 0} Hard</span>
              </>
            ) : (
              <span className="text-slate-500">No completed problems yet</span>
            )}
          </div>
        </div>

        {/* Card 2: Concepts Reviewed */}
        <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Concepts Covered</span>
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {stats.conceptsReviewed} <span className="text-sm font-normal text-slate-500">/ {totalConcepts}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-purple-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (stats.conceptsReviewed / Math.max(1, totalConcepts)) * 100)}%` }}
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
            {stats.currentStreak > 0 ? 'Consecutive daily problem solving' : 'Solve a problem today to start a streak'}
          </p>
        </div>

        {/* Card 4: Hint Reliance */}
        <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Hint Reliance</span>
            <Brain className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
            {stats.hintReliance?.label ?? '—'}
          </div>
          <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            {stats.hintReliance?.evaluatedSessions && stats.hintReliance.evaluatedSessions > 0
              ? `Average hint depth across ${stats.hintReliance.evaluatedSessions} evaluated session${stats.hintReliance.evaluatedSessions === 1 ? '' : 's'}`
              : 'Available after completing mentor sessions with hint tracking'}
          </p>
        </div>

      </div>

      {/* Weak Areas Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Diagnostic Weak Areas
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {stats.weakAreas.length > 0 
              ? `${stats.weakAreas.length} area${stats.weakAreas.length === 1 ? '' : 's'} flagged from recorded sessions` 
              : 'Minimum 3 sessions required per topic'}
          </span>
        </div>

        {stats.weakAreas.length === 0 ? (
          <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs space-y-1">
            <p className="font-medium text-slate-300">
              {stats.problemsPracticed === 0
                ? 'No problem sessions recorded yet.'
                : 'Not enough practice data to identify patterns.'}
            </p>
            <p className="text-slate-500">
              {stats.problemsPracticed === 0
                ? 'Solve problems and consult the mentor to generate diagnostic pattern insights.'
                : 'AlgoBuddy requires at least 3 recorded sessions for a specific topic tag before diagnosing pattern weaknesses.'}
            </p>
          </div>
        ) : (
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
                    <span className="text-[10px] text-slate-500">Observed</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {area.topic}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {area.reason}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-500 mb-2">
                    Evidence: Observed level 3+ hint requests in ≥ 50% of sessions.
                  </div>
                  <button
                    onClick={() => onNavigateToTopic('problem')}
                    className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-indigo-300 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Target in Practice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spaced Review Schedule Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Spaced Review Schedule & Retention
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Intervals: 1d → 3d → 7d → 14d → 30d
          </span>
        </div>

        {(!reviews || reviews.size === 0) ? (
          <div className="bg-[#0c1220] border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs space-y-1">
            <p className="font-medium text-slate-300">
              No spaced reviews scheduled yet.
            </p>
            <p className="text-slate-500">
              Complete problems in Problem Mode to enter the 5-stage spaced review schedule.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(reviews.values()).map(review => {
              const problemMap = new Map<string, Problem>((allProblems || []).map(p => [p.id, p]));
              const problem = problemMap.get(review.problemId);
              const title = problem ? problem.title : review.problemId;
              const difficulty = problem ? problem.difficulty : 'Medium';
              const status = evaluateReviewDueStatus(review);
              const isDue = status.isDue;

              return (
                <div
                  key={review.problemId}
                  className={`bg-[#0c1220] border rounded-2xl p-5 flex flex-col justify-between space-y-3 ${
                    isDue ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border tracking-wider ${
                        isDue
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {isDue ? (status.daysOverdue > 0 ? `${status.daysOverdue}d Overdue` : 'Due Today') : `In ${status.daysUntilDue}d`}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Stage {review.stage + 1} ({review.intervalDays}d)
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 truncate">
                      {title}
                    </h3>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                        difficulty === 'Easy' ? 'text-emerald-400 bg-emerald-500/10' :
                        difficulty === 'Medium' ? 'text-amber-400 bg-amber-500/10' :
                        'text-rose-400 bg-rose-500/10'
                      }`}>
                        {difficulty}
                      </span>
                      <span>•</span>
                      <span>{review.reviewCount} review{review.reviewCount === 1 ? '' : 's'} completed</span>
                    </div>

                    <div className="text-[10px] text-slate-500 pt-1">
                      {review.reviewDateUnavailable
                        ? 'Review date unavailable (legacy completion timestamp missing)'
                        : `Next review: ${review.nextReviewDate ? new Date(review.nextReviewDate).toLocaleDateString() : '—'}`}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      onClick={() => onNavigateToTopic('problem', review.problemId)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>
                    {isDue && onCompleteReview && (
                      <button
                        onClick={() => onCompleteReview(review.problemId)}
                        title="Explicitly confirm review completion (self-reported)"
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
            <span className="text-[11px] text-slate-500">
              {recommendations.length > 0 ? 'Adaptive ranking' : stats.recommendedNext.length > 0 ? 'Based on weak areas' : 'None yet'}
            </span>
          </div>

          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map(rec => {
                const categoryBadge = 
                  rec.category === 'weak_topic' ? { label: 'Needs Practice', style: 'bg-rose-500/10 text-rose-300 border-rose-500/20' } :
                  rec.category === 'concept_bridge' ? { label: 'Concept Bridge', style: 'bg-purple-500/10 text-purple-300 border-purple-500/20' } :
                  rec.category === 'review' ? { label: 'Spaced Review', style: 'bg-amber-500/10 text-amber-300 border-amber-500/20' } :
                  { label: 'General Practice', style: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' };

                return (
                  <div
                    key={rec.problemId}
                    onClick={() => onNavigateToTopic('problem', rec.problemId)}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-all hover:bg-slate-900 group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                        {rec.problem.title}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${categoryBadge.style}`}>
                        {categoryBadge.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mb-1">
                      {rec.problem.difficulty} • {rec.topic || rec.problem.tags[0]}
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">
                      {rec.reason}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      Evidence: {rec.evidence}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : stats.recommendedNext.length > 0 ? (
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
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-center">
              No topic recommendations yet. Practice problems across topics to unlock personalized recommendations.
            </div>
          )}
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

          {stats.recentlyStudied.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-center">
              No recently studied topics recorded yet. Start exploring problems or concepts!
            </div>
          ) : (
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
          )}
        </div>

      </div>

    </div>
  );
};
