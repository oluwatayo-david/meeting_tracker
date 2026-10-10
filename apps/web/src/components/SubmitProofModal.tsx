'use client';

import React, { useState } from 'react';
import { ActionItem, User } from '@/types';
import { UploadCloud, FileText, Link as LinkIcon, X, CheckCircle2 } from 'lucide-react';

interface SubmitProofModalProps {
  actionItem: ActionItem;
  currentUser: User;
  onClose: () => void;
  onSubmit: (actionItemId: string, notes: string, fileName?: string, fileUrl?: string) => void;
}

export const SubmitProofModal: React.FC<SubmitProofModalProps> = ({
  actionItem,
  currentUser,
  onClose,
  onSubmit,
}) => {
  const [notes, setNotes] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setIsUploading(true);
    setTimeout(() => {
      onSubmit(actionItem.id, notes, fileName, fileUrl);
      setIsUploading(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Submit Proof of Work</h3>
              <p className="text-xs text-slate-500">Provide completion evidence for manager sign-off</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200/70 space-y-1">
            <span className="font-semibold text-slate-500 uppercase text-[10px]">Action Point</span>
            <p className="font-bold text-slate-800">{actionItem.title}</p>
          </div>

          {/* Notes Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Completion Notes & Methodology Summary <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what was accomplished, baseline outcomes, and reference links..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Deliverable File / Link simulation */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              Evidence Attachment Name
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Field_Audit_Calibration_Report.pdf"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5 text-sky-600" />
              Deliverable Storage / Document URL
            </label>
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://..."
            />
          </div>

          <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-3 text-xs text-indigo-900 leading-relaxed">
            Upon submission, this item will enter the <strong>Manager Verification Portal</strong> for review and sign-off.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !notes.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              <UploadCloud className="h-4 w-4" />
              <span>{isUploading ? 'Submitting...' : 'Submit for Manager Sign-off'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
