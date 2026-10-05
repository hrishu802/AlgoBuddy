import React, { useState } from 'react';
import { Concept, ConceptDifficulty, ConceptStatus } from '../types';
import { 
  Search, 
  BookOpen, 
  Compass, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';

interface ConceptLibraryPageProps {
  concepts: Concept[];
  onStudyConcept: (concept: Concept) => void;
}

export const ConceptLibraryPage: React.FC<ConceptLibraryPageProps> = ({
  concepts,
  onStudyConcept,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Categories extraction
  const categories = ['All', ...Array.from(new Set(concepts.map(c => c.category)))];

  const filteredConcepts = concepts.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.whenToRecognize.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDifficulty = selectedDifficulty === 'All' || c.difficulty === selectedDifficulty;
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;

    return matchesSearch && matchesDifficulty && matchesCategory && matchesStatus;
  });

  const getDifficultyColor = (diff: ConceptDifficulty) => {
    switch (diff) {
      case 'Beginner':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Intermediate':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Advanced':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusColor = (status: ConceptStatus) => {
    switch (status) {
      case 'Mastered':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      case 'In Progress':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
      case 'Needs Review':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              DSA Concept Library
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Master recognition triggers, common archetypes, complexity profiles, and common pitfalls across 14 essential DSA topics.
          </p>
        </div>

        {/* Quick Stats Banner */}
        <div className="flex items-center gap-3 text-xs bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="font-semibold text-white">{concepts.length}</span>
            <span className="text-slate-500">Concepts</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="font-semibold">
              {concepts.filter(c => c.status === 'Mastered').length}
            </span>
            <span>Mastered</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="font-semibold">
              {concepts.filter(c => c.status === 'Needs Review').length}
            </span>
            <span>Needs Review</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search concepts, trigger keywords (e.g. subarray, palindrome, in-degree, knapsack)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0c1220] border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['All', 'Beginner', 'Intermediate', 'Advanced'].map(diff => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedDifficulty === diff
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider shrink-0 mr-1">
            Category:
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-indigo-300 font-medium border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Concepts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredConcepts.map(concept => (
          <div
            key={concept.id}
            className="bg-[#0c1220] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:shadow-lg transition-all group"
          >
            <div className="space-y-3">
              
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {concept.name}
                  </h3>
                  <span className="text-[11px] text-slate-500 block">
                    {concept.category}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border tracking-wider ${getDifficultyColor(concept.difficulty)}`}>
                    {concept.difficulty}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${getStatusColor(concept.status)}`}>
                    {concept.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {concept.shortDescription}
              </p>

              {/* Recognition Trigger Preview */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 block">
                  When to Recognize:
                </span>
                <div className="text-[11px] text-slate-300 bg-slate-900/60 border border-slate-800 p-2 rounded-lg line-clamp-2 italic">
                  "{concept.whenToRecognize[0]}"
                </div>
              </div>

              {/* Common Patterns */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Key Archetypes:
                </span>
                <div className="flex flex-wrap gap-1">
                  {concept.commonPatterns.map((pat, idx) => (
                    <span 
                      key={idx}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                    >
                      {pat.name}
                    </span>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Action */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                {concept.commonPatterns.length} patterns • 1 quiz
              </span>
              <button
                onClick={() => onStudyConcept(concept)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 hover:border-transparent text-indigo-300 hover:text-white text-xs font-semibold transition-all group-hover:scale-[1.02]"
              >
                <span>Study with Mentor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        ))}
      </div>

      {filteredConcepts.length === 0 && (
        <div className="text-center py-16 text-slate-500 space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-sm">No DSA concepts matched your search filter.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedDifficulty('All');
              setSelectedCategory('All');
              setSelectedStatus('All');
            }}
            className="text-xs text-indigo-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

    </div>
  );
};
