import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, PedagogyStage, AppMode, HintLevel } from '../types';
import { 
  Send, 
  Sparkles, 
  BrainCircuit, 
  User, 
  Copy, 
  Check, 
  ArrowRight,
  Sprout,
  Lightbulb,
  Zap,
  BookOpenCheck,
  KeyRound,
  Compass
} from 'lucide-react';
import { SafeMarkdown } from './SafeMarkdown';

interface MentorChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  currentStage: PedagogyStage;
  mode: AppMode;
  onSelectActionChip?: (action: string) => void;
}

export const MentorChat: React.FC<MentorChatProps> = ({
  messages,
  onSendMessage,
  isLoading,
  currentStage,
  mode,
  onSelectActionChip,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 1500);
  };

  const getHintBadge = (level?: HintLevel) => {
    switch (level) {
      case 'nudge':
        return { label: '🌱 Nudge (Level 1)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'hint':
        return { label: '💡 Hint (Level 2)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'strong_hint':
        return { label: '⚡ Strong Hint (Level 3)', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 'explain':
        return { label: '📖 Logic Breakdown (Level 4)', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'solution':
        return { label: '🎯 Reference Solution (Level 5)', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
      default:
        return null;
    }
  };

  // Quick action suggestions based on mode
  const quickPrompts = mode === 'problem' 
    ? [
        "What's the straightforward brute force?",
        "Give me a subtle nudge on constraints",
        "Which DSA pattern applies here?",
        "Check my intuition"
      ]
    : mode === 'concept'
    ? [
        "When does this fail or perform poorly?",
        "What are the interview trigger keywords?",
        "Show a practical code archetype"
      ]
    : [
        "How do I eliminate the nested loop?",
        "What is the space complexity bottleneck?",
        "Can we solve this in O(1) auxiliary space?"
      ];

  return (
    <div className="h-full flex flex-col bg-[#070b13] text-slate-200 overflow-hidden">
      
      {/* Mentor Chat Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-[#090d16] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-100">
                AlgoBuddy Mentor
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Ready to guide" />
            </div>
            <p className="text-[10px] text-slate-400">
              Socratic Guide • <span className="text-indigo-400 capitalize">{currentStage} stage</span>
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 hidden sm:block italic font-medium">
          "Don't just get the answer. Learn how to find it."
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const hintBadge = getHintBadge(msg.hintLevel);

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <BrainCircuit className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-xl p-3.5 space-y-2 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-[#0f172a] border border-slate-800 text-slate-200 shadow-sm'
                }`}
              >
                {/* Hint Level or Stage Header */}
                {hintBadge && (
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${hintBadge.color}`}>
                    {hintBadge.label}
                  </div>
                )}

                {/* Safe Markdown Content */}
                <SafeMarkdown
                  content={msg.content}
                  className={isUser ? 'text-white' : 'text-slate-200'}
                />

                {/* Optional Embedded Code Snippet */}
                {msg.codeSnippet && (
                  <div className="mt-2 rounded-lg bg-[#060910] border border-slate-800 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] font-mono text-slate-400">
                      <span>{msg.codeSnippet.language}</span>
                      <button
                        onClick={() => handleCopyCode(msg.codeSnippet!.code, msg.id)}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        {copiedCodeId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto">
                      <code>{msg.codeSnippet.code}</code>
                    </pre>
                  </div>
                )}

                {/* Suggested Action Chips */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                      Recommended Next Steps:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (onSelectActionChip) {
                              onSelectActionChip(action);
                            } else {
                              onSendMessage(action);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-indigo-300 font-medium transition-colors text-left"
                        >
                          <span>{action}</span>
                          <ArrowRight className="w-3 h-3 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[9px] text-slate-500 text-right pt-0.5">
                  {msg.timestamp}
                </div>
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-slate-400">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BrainCircuit className="w-4 h-4 animate-spin" />
            </div>
            <div className="flex items-center gap-1 bg-[#0f172a] border border-slate-800 px-3 py-2 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-slate-400 ml-1.5">Mentor is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Section: Quick Action Prompts + Chat Input */}
      <div className="p-3 border-t border-slate-800 bg-[#090d16] space-y-2 shrink-0">
        
        {/* Quick Prompts Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <span className="text-slate-500 shrink-0 font-medium">Quick:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(prompt)}
              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 whitespace-nowrap transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Box */}
        <div className="relative flex items-end gap-2 bg-[#05080e] border border-slate-700/80 rounded-xl p-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask mentor a question, check your intuition, or test an invariant... (Enter to send)"
            rows={2}
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
          />

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shrink-0 shadow-sm shadow-indigo-600/20"
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span>Press <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for newline</span>
          <span className="text-indigo-400/80">AlgoBuddy Socratic Pedagogical AI</span>
        </div>

      </div>

    </div>
  );
};
