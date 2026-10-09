'use client';

import React, { useState } from 'react';
import { ActionItem, User, ActionStatus, Priority } from '@/types';
import { 
  Sparkles, 
  Send, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  User as UserIcon, 
  FileCheck2, 
  History,
  AlertTriangle,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2
} from 'lucide-react';

interface ActionItemsViewProps {
  actionItems: ActionItem[];
  currentUser: User;
  users?: User[];
  onOpenCoPilot: (item: ActionItem) => void;
  onSubmitProof: (item: ActionItem) => void;
  onSendReminder: (item: ActionItem) => void;
  onInspectAudit: (item: ActionItem) => void;
  onActionItemsUpdated?: () => void;
}

export const ActionItemsView: React.FC<ActionItemsViewProps> = ({
  actionItems,
  currentUser,
  users = [],
  onOpenCoPilot,
  onSubmitProof,
  onSendReminder,
  onInspectAudit,
  onActionItemsUpdated,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [onlyMine, setOnlyMine] = useState<boolean>(false);

  // Edit State
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('MEDIUM');
  const [editStatus, setEditStatus] = useState<ActionStatus>('PENDING');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete State
  const [deletingItem, setDeletingItem] = useState<ActionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredItems = actionItems.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (onlyMine && item.assigneeId !== currentUser.id && item.assigneeEmail !== currentUser.email) return false;
    return true;
  });

  const getStatusBadge = (status: ActionStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Approved & Verified
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
            <FileCheck2 className="h-3 w-3" /> Awaiting Review
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
            <Clock className="h-3 w-3" /> In Progress
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
            <AlertTriangle className="h-3 w-3" /> Revision Needed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
            Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
            High Priority
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            Low
          </span>
        );
    }
  };

  const handleOpenEdit = (item: ActionItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditAssigneeId(item.assigneeId || '');
    setEditDueDate(item.dueDate ? item.dueDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditPriority(item.priority);
    setEditStatus(item.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim()) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/action-items/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          assigneeId: editAssigneeId || undefined,
          dueDate: new Date(editDueDate).toISOString(),
          priority: editPriority,
          status: editStatus,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update action item');
      }

      setEditingItem(null);
      onActionItemsUpdated?.();
    } catch (err) {
      console.error('Save action item error:', err);
      alert(err instanceof Error ? err.message : 'Error updating action item');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/action-items/${deletingItem.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete action item');
      }

      setDeletingItem(null);
      onActionItemsUpdated?.();
    } catch (err) {
      console.error('Delete action item error:', err);
      alert(err instanceof Error ? err.message : 'Error deleting action item');
    } finally {
      setIsDeleting(false);
    }
  };

  const isPrivileged = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Action Points Delegation Board</h2>
          <p className="text-xs text-slate-500">
            Track ownership, timelines, AI research co-piloting, and proof submissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle only mine */}
          <button
            onClick={() => setOnlyMine(!onlyMine)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              onlyMine
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserIcon className="h-3.5 w-3.5" />
            <span>Assigned to Me</span>
          </button>

          {/* Status Tabs */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs">
            {['ALL', 'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 font-semibold rounded-lg transition-all capitalize cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status.toLowerCase().replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Items List */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const isAssignee = currentUser.id === item.assigneeId || currentUser.email === item.assigneeEmail;
          const isManager = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN';
          const isUrgent = item.priority === 'URGENT' && item.status !== 'APPROVED';
          const canManage = isManager || isAssignee;

          return (
            <div
              key={item.id}
              className={`rounded-2xl bg-white border p-5 shadow-xs transition-all hover:shadow-md space-y-4 ${
                isUrgent ? 'border-rose-200/90 ring-1 ring-rose-200/50' : 'border-slate-200/80'
              }`}
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(item.status)}
                    {getPriorityBadge(item.priority)}
                    {item.meetingTitle && (
                      <span className="text-xs text-slate-500 font-medium truncate max-w-xs">
                        From: {item.meetingTitle}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                </div>

                {/* Right badges & Actions */}
                <div className="flex items-center gap-1.5 self-start">
                  {item.reminderCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200">
                      <Send className="h-3 w-3" /> {item.reminderCount} Reminders
                    </span>
                  )}

                  <button
                    onClick={() => onInspectAudit(item)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer"
                    title="Audit trail"
                  >
                    <History className="h-4 w-4" />
                  </button>

                  {canManage && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        title="Edit action item"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-sky-600 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {isManager && (
                        <button
                          onClick={() => setDeletingItem(item)}
                          title="Delete action item"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Task Details & Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                {/* Assignee & Due Date */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-[10px]">
                      {item.assigneeName ? item.assigneeName.charAt(0) : 'U'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">{item.assigneeName || 'Unassigned'}</span>
                      {isAssignee && <span className="ml-1 text-[10px] text-sky-600 font-bold">(You)</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500 font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Due: {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* AI Research Co-Pilot CTA */}
                  <button
                    onClick={() => onOpenCoPilot(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 hover:border-sky-300 text-indigo-700 text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Gemini AI Co-Pilot</span>
                  </button>

                  {/* Send Reminder CTA (for managers) */}
                  {isManager && item.status !== 'APPROVED' && (
                    <button
                      onClick={() => onSendReminder(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Send className="h-3 w-3 text-sky-600" />
                      <span>Send Reminder</span>
                    </button>
                  )}

                  {/* Submit Proof of Work CTA */}
                  {item.status !== 'APPROVED' && (
                    <button
                      onClick={() => onSubmitProof(item)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>{item.status === 'SUBMITTED' ? 'Update Proof' : 'Submit Proof'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Submitted Proof summary callout if exists */}
              {item.proofSubmissions && item.proofSubmissions.length > 0 && (
                <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                      Latest Deliverable Submitted ({new Date(item.proofSubmissions[0].submittedAt).toLocaleDateString()})
                    </span>
                    <span className={`text-[10px] font-bold uppercase ${
                      item.proofSubmissions[0].status === 'APPROVED' ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {item.proofSubmissions[0].status}
                    </span>
                  </div>
                  <p className="text-slate-600 italic">&quot;{item.proofSubmissions[0].notes}&quot;</p>
                  {item.proofSubmissions[0].fileName && (
                    <p className="font-mono text-[11px] text-sky-600">
                      Attachment: {item.proofSubmissions[0].fileName}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No action items in this view</p>
            <p className="text-xs text-slate-500 mt-1">Change your filter or record a new meeting to generate action points.</p>
          </div>
        )}
      </div>

      {/* Edit Action Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Action Item</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Task Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Description / Deliverable</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Assignee</label>
                  <select
                    value={editAssigneeId}
                    onChange={(e) => setEditAssigneeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Priority)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ActionStatus)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="SUBMITTED">Submitted / Review Ready</option>
                    <option value="APPROVED">Approved & Verified</option>
                    <option value="REJECTED">Revision Needed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Action Item Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Action Item?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete &quot;{deletingItem.title}&quot;? Any attached proof submissions will also be deleted.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
