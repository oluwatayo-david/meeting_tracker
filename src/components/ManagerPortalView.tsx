'use client';

import React, { useState } from 'react';
import { ActionItem, User } from '@/types';
import { 
  ShieldCheck, 
  FileCheck2, 
  Check, 
  X, 
  Clock, 
  FileText, 
  ExternalLink, 
  AlertTriangle,
  History,
  CheckCircle2,
  MessageSquare
} from 'lucide-react';

interface ManagerPortalViewProps {
  actionItems: ActionItem[];
  currentUser: User;
  onApproveProof: (actionItemId: string, proofId: string, notes: string) => void;
  onRejectProof: (actionItemId: string, proofId: string, notes: string) => void;
}

export const ManagerPortalView: React.FC<ManagerPortalViewProps> = ({
  actionItems,
  currentUser,
  onApproveProof,
  onRejectProof,
}) => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'RESOLVED'>('PENDING');
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [reviewModalType, setReviewModalType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');

  // Items waiting for manager approval
  const pendingReviews = actionItems.filter(
    (a) => a.status === 'SUBMITTED' && a.proofSubmissions.length > 0
  );

  // Past resolved items (Approved or Rejected)
  const resolvedReviews = actionItems.filter(
    (a) => a.status === 'APPROVED' || a.status === 'REJECTED'
  );

  const isManager = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN';

  const handleOpenReview = (action: ActionItem, type: 'APPROVE' | 'REJECT') => {
    setSelectedAction(action);
    setReviewModalType(type);
    setFeedbackNotes(
      type === 'APPROVE'
        ? 'Verified and meets institutional quality standards. Approved.'
        : 'Deliverables missing required details. Please revise and resubmit.'
    );
  };

  const handleConfirmReview = () => {
    if (!selectedAction || !selectedAction.proofSubmissions[0] || !reviewModalType) return;
    const proofId = selectedAction.proofSubmissions[0].id;

    if (reviewModalType === 'APPROVE') {
      onApproveProof(selectedAction.id, proofId, feedbackNotes);
    } else {
      onRejectProof(selectedAction.id, proofId, feedbackNotes);
    }

    setReviewModalType(null);
    setSelectedAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manager Verification & Sign-Off Portal</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" /> High-Assurance Gate
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict verification authority: Only managers and admins can approve or request revisions for submitted action deliverables.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs self-start">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg transition-all ${
              activeTab === 'PENDING'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Pending Review ({pendingReviews.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('RESOLVED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg transition-all ${
              activeTab === 'RESOLVED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5 text-indigo-600" />
            <span>Audit History ({resolvedReviews.length})</span>
          </button>
        </div>
      </div>

      {!isManager && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Role Notification:</span> You are currently viewing as <strong>{currentUser.name} ({currentUser.role})</strong>. 
            Only users with <strong>MANAGER</strong> or <strong>ADMIN</strong> authority can sign off or reject proof.
          </div>
        </div>
      )}

      {/* Pending Reviews Queue */}
      {activeTab === 'PENDING' && (
        <div className="space-y-4">
          {pendingReviews.map((action) => {
            const latestProof = action.proofSubmissions[0];

            return (
              <div
                key={action.id}
                className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                        <FileCheck2 className="h-3.5 w-3.5" /> Ready for Verification
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Meeting: {action.meetingTitle || 'SCIDaR Strategy'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{action.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{action.description}</p>
                  </div>

                  {/* Assignee Card */}
                  <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 self-start">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                      {action.assigneeName?.charAt(0) || 'A'}
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-slate-800">{action.assigneeName}</p>
                      <p className="text-[11px] text-slate-500">Assignee</p>
                    </div>
                  </div>
                </div>

                {/* Proof of Work Deliverable Inspection Box */}
                {latestProof && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5 text-indigo-900 font-bold">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        Submitted Evidence & Deliverable Notes
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        Submitted: {new Date(latestProof.submittedAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/70 font-sans">
                      &quot;{latestProof.notes}&quot;
                    </p>

                    {latestProof.fileName && (
                      <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200 text-xs">
                        <div className="flex items-center gap-2 font-mono text-slate-800">
                          <FileText className="h-4 w-4 text-sky-600" />
                          <span>{latestProof.fileName}</span>
                        </div>
                        <a
                          href={latestProof.fileUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-700"
                        >
                          <span>Inspect Deliverable</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Manager Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    disabled={!isManager}
                    onClick={() => handleOpenReview(action, 'REJECT')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-rose-700 font-semibold text-xs transition-all disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    <span>Request Revision</span>
                  </button>

                  <button
                    disabled={!isManager}
                    onClick={() => handleOpenReview(action, 'APPROVE')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    <span>Approve Deliverable</span>
                  </button>
                </div>
              </div>
            );
          })}

          {pendingReviews.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-800">Review Inbox Clear</p>
              <p className="text-xs text-slate-500 mt-1">
                All submitted deliverables have been verified and processed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Audit History Tab */}
      {activeTab === 'RESOLVED' && (
        <div className="space-y-4">
          {resolvedReviews.map((action) => {
            const isApproved = action.status === 'APPROVED';
            const latestProof = action.proofSubmissions[0];

            return (
              <div
                key={action.id}
                className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {isApproved ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {action.status}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Assignee: {action.assigneeName}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{action.title}</h3>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    Updated: {new Date(action.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {latestProof?.reviewNotes && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs space-y-1">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                      Manager Feedback ({latestProof.reviewedByName || 'Manager'}):
                    </span>
                    <p className="text-slate-600 italic">&quot;{latestProof.reviewNotes}&quot;</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Confirmation Modal */}
      {reviewModalType && selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {reviewModalType === 'APPROVE' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                )}
                <span>
                  {reviewModalType === 'APPROVE' ? 'Approve Action Deliverable' : 'Request Revision / Reject'}
                </span>
              </h3>
              <button
                onClick={() => setReviewModalType(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-slate-800">Task: {selectedAction.title}</p>
              <p className="text-slate-500">Submitted by: {selectedAction.assigneeName}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {reviewModalType === 'APPROVE' ? 'Manager Approval Note (Optional):' : 'Revision Feedback for Assignee (Required):'}
              </label>
              <textarea
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Provide constructive verification feedback..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReviewModalType(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReview}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md ${
                  reviewModalType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {reviewModalType === 'APPROVE' ? 'Confirm Approval' : 'Submit Rejection & Notify Assignee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
