'use client';

import React, { useState } from 'react';
import { ActionItem } from '@/types';
import { 
  Sparkles, 
  CheckSquare, 
  Square, 
  Send, 
  RefreshCw, 
  Bot, 
  BookOpen, 
  CheckCircle2,
  ListOrdered,
  X
} from 'lucide-react';
import { COPILOT_NAME } from '@/lib/brand';

interface AiCoPilotModalProps {
  actionItem: ActionItem;
  onClose: () => void;
  onRegenerateGuidance: (actionItem: ActionItem) => Promise<string>;
}

export const AiCoPilotModal: React.FC<AiCoPilotModalProps> = ({
  actionItem,
  onClose,
  onRegenerateGuidance,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [guidance, setGuidance] = useState<string>(
    actionItem.aiGuidance || 'No guidance generated yet.'
  );
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const newAdvice = await onRegenerateGuidance(actionItem);
      setGuidance(newAdvice);
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (idx: number) => {
    setCompletedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="flex flex-col max-h-[90vh] w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{COPILOT_NAME}</h3>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  AI Assistant
                </span>
              </div>
              <p className="text-xs text-slate-500">Execution guidance & verification criteria</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Action Item Subject */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Task</span>
            <h4 className="text-sm font-bold text-slate-900">{actionItem.title}</h4>
            <p className="text-xs text-slate-600">{actionItem.description}</p>
            <div className="flex items-center gap-4 pt-2 text-xs text-slate-500 font-medium">
              <span>Assignee: <strong>{actionItem.assigneeName}</strong></span>
              <span>Due: <strong>{new Date(actionItem.dueDate).toLocaleDateString()}</strong></span>
            </div>
          </div>

          {/* AI Guidance Markdown & Interactive Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-indigo-600" />
                Strategic Execution Blueprint
              </span>
              <button
                disabled={loading}
                onClick={handleRegenerate}
                className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Analysing...' : 'Regenerate Analysis'}</span>
              </button>
            </div>

            <div className="rounded-xl bg-indigo-50/40 border border-indigo-100 p-4 text-xs text-slate-800 space-y-3 leading-relaxed whitespace-pre-wrap font-sans">
              {guidance}
            </div>
          </div>

          {/* Practical Interactive Execution Checklist */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-emerald-600" />
              Assignee Pre-Submission Checklist
            </span>
            <div className="space-y-2 text-xs">
              {[
                'Review standard institutional compliance specifications.',
                'Obtain cross-departmental alignment and initial feedback.',
                'Perform quality benchmark / sanity check against target metrics.',
                'Prepare supporting evidence documentation or export deliverable.'
              ].map((step, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleStep(idx)}
                  className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                    completedSteps[idx] ? 'bg-emerald-50 text-emerald-900 line-through' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {completedSteps[idx] ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">AI-generated guidance — review before acting</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
