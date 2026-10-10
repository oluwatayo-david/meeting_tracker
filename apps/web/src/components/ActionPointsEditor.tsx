'use client';

import React, { useState, useCallback } from 'react';
import { ActionItem, Meeting } from '@/types';
import {
  FileDown, Sparkles, Bold, Italic, List, ListOrdered,
  Undo2, Redo2, AlignLeft, AlignCenter, Heading2, Loader2,
  Edit3, Check, X, Plus, Trash2, Wand2
} from 'lucide-react';

interface EditableActionItem extends ActionItem {
  isEditing?: boolean;
  editTitle?: string;
  editDescription?: string;
  editGuidance?: string;
}

interface ActionPointsEditorProps {
  meeting: Meeting;
  actionItems: ActionItem[];
  onItemsUpdated?: (items: ActionItem[]) => void;
}

const priorityConfig = {
  URGENT: { color: '#ef4444', bg: '#7f1d1d', label: '🔴 URGENT' },
  HIGH: { color: '#f59e0b', bg: '#78350f', label: '🟠 HIGH' },
  MEDIUM: { color: '#3b82f6', bg: '#1e3a5f', label: '🔵 MEDIUM' },
  LOW: { color: '#22c55e', bg: '#14532d', label: '🟢 LOW' },
};

export function ActionPointsEditor({ meeting, actionItems, onItemsUpdated }: ActionPointsEditorProps) {
  const [items, setItems] = useState<EditableActionItem[]>(actionItems.map(a => ({ ...a })));
  const [isExporting, setIsExporting] = useState(false);
  const [isRefining, setIsRefining] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const updateItem = (id: string, updates: Partial<EditableActionItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const startEdit = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    updateItem(id, {
      isEditing: true,
      editTitle: item.title,
      editDescription: item.description,
      editGuidance: item.aiGuidance || '',
    });
  };

  const saveEdit = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    updateItem(id, {
      isEditing: false,
      title: item.editTitle || item.title,
      description: item.editDescription || item.description,
      aiGuidance: item.editGuidance || item.aiGuidance,
    });
    onItemsUpdated?.(items.map(i => i.id === id ? {
      ...i,
      title: item.editTitle || item.title,
      description: item.editDescription || item.description,
      aiGuidance: item.editGuidance || item.aiGuidance,
    } : i));
  };

  const cancelEdit = (id: string) => updateItem(id, { isEditing: false });

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const addNewItem = () => {
    const newItem: EditableActionItem = {
      id: `temp-${Date.now()}`,
      meetingId: meeting.id,
      title: 'New Action Point',
      description: 'Describe the expected deliverable...',
      priority: 'MEDIUM',
      status: 'PENDING',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      reminderCount: 0,
      proofSubmissions: [],
      auditLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEditing: true,
      editTitle: 'New Action Point',
      editDescription: 'Describe the expected deliverable...',
    };
    setItems(prev => [...prev, newItem]);
  };

  const refineWithAI = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    setIsRefining(id);
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionItemId: item.id,
          title: item.title,
          description: item.description,
          mode: 'refine',
        }),
      });
      const data = await res.json();
      if (data.advice) {
        updateItem(id, { aiGuidance: data.advice });
      }
    } finally {
      setIsRefining(null);
    }
  };

  const exportToPPTX = useCallback(async () => {
    setIsExporting(true);
    try {
      // Call server-side API route (pptxgenjs needs Node.js fs — can't run in browser)
      const res = await fetch('/api/export-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting, actionItems: items }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Export failed');
      }

      // Trigger file download from the binary response
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_Action_Points.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PPTX export error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [meeting, items]);

  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'editor' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Edit3 className="h-3.5 w-3.5 inline mr-1.5" />
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'preview' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Preview
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addNewItem}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-xl transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Point
          </button>
          <button
            onClick={exportToPPTX}
            disabled={isExporting || items.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-4 py-1.5 rounded-xl transition-all text-xs shadow-lg shadow-violet-500/20 disabled:opacity-60"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            {isExporting ? 'Generating...' : 'Export .pptx'}
          </button>
        </div>
      </div>

      {/* Editor tab */}
      {activeTab === 'editor' && (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden transition-all"
            >
              {item.isEditing ? (
                /* Edit mode */
                <div className="p-4 space-y-3">
                  <input
                    value={item.editTitle}
                    onChange={(e) => updateItem(item.id, { editTitle: e.target.value })}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    placeholder="Action point title..."
                  />
                  <textarea
                    value={item.editDescription}
                    onChange={(e) => updateItem(item.id, { editDescription: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                    placeholder="Expected deliverable..."
                  />
                  <textarea
                    value={item.editGuidance}
                    onChange={(e) => updateItem(item.id, { editGuidance: e.target.value })}
                    rows={4}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none font-mono"
                    placeholder="AI guidance / execution steps..."
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => cancelEdit(item.id)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-600 px-3 py-1.5 rounded-xl transition-all">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                    <button onClick={() => saveEdit(item.id)} className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-xl transition-all">
                      <Check className="h-3.5 w-3.5" /> Save
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-violet-400">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            item.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-300' :
                            item.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                            item.priority === 'MEDIUM' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                          {item.assigneeName && <span>👤 {item.assigneeName}</span>}
                          <span>📅 {new Date(item.dueDate).toLocaleDateString('en-GB')}</span>
                        </div>
                        {item.aiGuidance && (
                          <div className="mt-2 bg-violet-500/5 border border-violet-500/10 rounded-xl p-2.5">
                            <p className="text-[11px] text-slate-400 line-clamp-2">{item.aiGuidance.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => refineWithAI(item.id)}
                        disabled={isRefining === item.id}
                        title="Refine with AI"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                      >
                        {isRefining === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => startEdit(item.id)}
                        title="Edit"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        title="Remove"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">
              No action points yet. They'll appear here after AI analysis of the transcript.
            </div>
          )}
        </div>
      )}

      {/* Preview tab — PowerPoint-like card view */}
      {activeTab === 'preview' && (
        <div className="space-y-3">
          {items.map((item, i) => {
            const pc = priorityConfig[item.priority];
            return (
              <div
                key={item.id}
                className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-slate-700 rounded-2xl overflow-hidden shadow-lg"
              >
                {/* Slide header */}
                <div className="bg-gradient-to-r from-violet-700 to-indigo-700 px-5 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-200 uppercase tracking-widest">
                    Action Point {i + 1}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: pc.bg, color: pc.color }}
                  >
                    {pc.label}
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 mb-1">Assigned To</p>
                      <p className="text-xs font-semibold text-white">{item.assigneeName || 'Unassigned'}</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 mb-1">Due Date</p>
                      <p className="text-xs font-semibold text-white">{new Date(item.dueDate).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 mb-1">Status</p>
                      <p className="text-xs font-semibold text-white">{item.status}</p>
                    </div>
                  </div>
                  {item.aiGuidance && (
                    <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="h-3 w-3 text-violet-400" />
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">AI Guidance</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-4">
                        {item.aiGuidance.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').replace(/\*/g, '')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
