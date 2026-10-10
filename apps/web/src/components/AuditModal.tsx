'use client';

import React from 'react';
import { ActionItem } from '@/types';
import { History, X, Clock, ShieldCheck, Send, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

interface AuditModalProps {
  actionItem: ActionItem;
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ actionItem, onClose }) => {
  const getIcon = (action: string) => {
    if (action.includes('APPROVED')) return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    if (action.includes('REJECTED')) return <AlertTriangle className="h-4 w-4 text-rose-600" />;
    if (action.includes('REMINDER')) return <Send className="h-4 w-4 text-sky-600" />;
    if (action.includes('PROOF')) return <FileText className="h-4 w-4 text-indigo-600" />;
    return <Clock className="h-4 w-4 text-slate-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Task Audit Trail</h3>
              <p className="text-xs text-slate-500">Immutable record of assignments, reminders, and verification</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200/70">
            <p className="font-bold text-slate-900">{actionItem.title}</p>
            <p className="text-slate-500 mt-0.5">Status: <span className="font-semibold text-slate-800">{actionItem.status}</span></p>
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {actionItem.auditLogs.map((log) => (
              <div key={log.id} className="relative space-y-1 text-xs">
                <div className="absolute -left-6 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-slate-200">
                  {getIcon(log.action)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-600">{log.details}</p>
                <p className="text-[11px] text-slate-400 font-medium">Actor: {log.actorName}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
