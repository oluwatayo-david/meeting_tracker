'use client';

import React, { useState } from 'react';
import { TranscriptSegment, ActionItem } from '@/types';
import { Sparkles, ChevronDown, ChevronUp, Clock, Zap, MessageSquare } from 'lucide-react';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  rawTranscript: string;
  summary?: string;
  actionItems?: ActionItem[];
}

export function TranscriptViewer({ segments, rawTranscript, summary, actionItems }: TranscriptViewerProps) {
  const [view, setView] = useState<'highlights' | 'full'>('highlights');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const highlights = segments.filter((s) => s.isHighlight);
  const toggleExpand = (i: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary box */}
      {summary && (
        <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border border-violet-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">AI Meeting Summary</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1">
        <button
          onClick={() => setView('highlights')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            view === 'highlights'
              ? 'bg-violet-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          AI Highlights ({highlights.length})
        </button>
        <button
          onClick={() => setView('full')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            view === 'full'
              ? 'bg-slate-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Full Transcript
        </button>
      </div>

      {/* Content */}
      {view === 'highlights' ? (
        <div className="space-y-2.5">
          {highlights.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">
              No highlights detected yet. Start recording to see AI highlights in real time.
            </p>
          )}
          {highlights.map((seg, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleExpand(i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-700/60 px-2 py-1 rounded-md">
                    <Clock className="h-3 w-3" />
                    {formatTime(seg.timestamp)}
                  </div>
                  <span className="text-xs font-medium text-violet-300">⚡ {seg.highlightReason || 'Key moment'}</span>
                </div>
                {expandedItems.has(i)
                  ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                }
              </button>
              {expandedItems.has(i) && (
                <div className="px-4 pb-3 border-t border-slate-700/50">
                  <p className="text-sm text-slate-300 leading-relaxed pt-2">{seg.text}</p>
                </div>
              )}
              {!expandedItems.has(i) && (
                <p className="px-4 pb-3 text-xs text-slate-400 line-clamp-1">{seg.text}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 max-h-72 overflow-y-auto">
          {segments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No transcript yet.</p>
          ) : (
            <div className="space-y-3">
              {segments.map((seg, i) => (
                <div key={i} className={`flex gap-3 ${seg.isHighlight ? 'bg-violet-500/10 rounded-lg p-2' : ''}`}>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0 pt-0.5">
                    {formatTime(seg.timestamp)}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">{seg.text}</p>
                </div>
              ))}
            </div>
          )}
          {!segments.length && rawTranscript && (
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{rawTranscript}</p>
          )}
        </div>
      )}

      {/* Action Items Preview */}
      {actionItems && actionItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              AI Extracted {actionItems.length} Action Points
            </span>
          </div>
          {actionItems.map((item, i) => (
            <div
              key={item.id}
              className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3.5"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-emerald-400">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">{item.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {item.assigneeName && (
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                      👤 {item.assigneeName}
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    item.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-300' :
                    item.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {item.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
