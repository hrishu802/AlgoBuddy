import React from 'react';
import { Clock, HardDrive } from 'lucide-react';

interface ComplexityBadgeProps {
  time: string;
  space: string;
  label?: string;
}

export const ComplexityBadge: React.FC<ComplexityBadgeProps> = ({
  time,
  space,
  label = 'Target Complexity',
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {label && (
        <span className="text-slate-400 font-medium text-[11px]">
          {label}:
        </span>
      )}
      <div 
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[11px]"
        title="Time Complexity"
      >
        <Clock className="w-3 h-3 text-indigo-400" />
        <span>Time: {time}</span>
      </div>
      <div 
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px]"
        title="Space Complexity"
      >
        <HardDrive className="w-3 h-3 text-emerald-400" />
        <span>Space: {space}</span>
      </div>
    </div>
  );
};
