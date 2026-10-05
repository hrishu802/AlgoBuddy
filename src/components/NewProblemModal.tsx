import React, { useState } from 'react';
import { Problem, Difficulty } from '../types';
import { X, Sparkles, PlusCircle } from 'lucide-react';

interface NewProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProblem: (problem: Problem) => void;
}

export const NewProblemModal: React.FC<NewProblemModalProps> = ({
  isOpen,
  onClose,
  onAddProblem,
}) => {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [category, setCategory] = useState('Dynamic Programming');
  const [description, setDescription] = useState('');
  const [constraintsText, setConstraintsText] = useState('1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4');
  const [exampleInput, setExampleInput] = useState('nums = [1, 2, 3, 4]');
  const [exampleOutput, setExampleOutput] = useState('10');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const constraints = constraintsText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const newProblem: Problem = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      difficulty,
      category,
      tags: [category, 'Custom Problem'],
      description: description.trim(),
      examples: [
        {
          input: exampleInput.trim(),
          output: exampleOutput.trim(),
        }
      ],
      constraints: constraints.length > 0 ? constraints : ['Standard interview constraints apply.'],
      bruteForce: {
        approach: 'Exhaustive check of all permutations/combinations.',
        time: 'O(N^2) or higher',
        space: 'O(1)'
      },
      optimalPattern: `${category} Optimal Pattern`,
      optimalComplexity: {
        time: 'O(N) or O(N log N)',
        space: 'O(N) or O(1)'
      },
      hints: {
        nudge: 'Look at the input constraints to deduce the target Big-O boundary.',
        hint: `How can you leverage ${category} concepts to avoid recalculating overlapping states?`,
        strongHint: 'Store prior subproblem states or pointers to reduce the outer search space.',
        explain: 'Formulate an invariant where each element is processed a constant number of times.',
        solution: {
          language: 'python',
          code: `# Reference template for ${title}\ndef solution(*args):\n    # Write clean optimal logic here\n    pass`,
          explanation: 'Optimal approach breaking the problem down with linear or logarithmic scan.'
        }
      },
      socraticQuestions: [
        'What is the maximum time complexity permitted by your input size?',
        'Can you formulate the problem as smaller overlapping subproblems?'
      ]
    };

    onAddProblem(newProblem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Paste / Add Any DSA Problem
              </h3>
              <p className="text-[11px] text-slate-400">
                AlgoBuddy will mentor you Socratically through it
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Problem Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Subarray Sum Equals K, Course Schedule II"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="Arrays">Arrays</option>
                <option value="Two Pointers">Two Pointers</option>
                <option value="Sliding Window">Sliding Window</option>
                <option value="Hashing">Hashing</option>
                <option value="Stack">Stack</option>
                <option value="Binary Search">Binary Search</option>
                <option value="Trees">Trees</option>
                <option value="Graphs">Graphs</option>
                <option value="Dynamic Programming">Dynamic Programming</option>
                <option value="Greedy">Greedy</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Problem Description *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Paste the problem statement from LeetCode or interview..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Example Input
              </label>
              <input
                type="text"
                placeholder="nums = [1, 2, 3], k = 3"
                value={exampleInput}
                onChange={(e) => setExampleInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Example Output
              </label>
              <input
                type="text"
                placeholder="2"
                value={exampleOutput}
                onChange={(e) => setExampleOutput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Constraints (one per line)
            </label>
            <textarea
              rows={2}
              placeholder="1 <= nums.length <= 10^5&#10;-10^9 <= target <= 10^9"
              value={constraintsText}
              onChange={(e) => setConstraintsText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm shadow-indigo-600/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start Mentoring Session</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
