'use client';

import React, { useState } from 'react';
import { Meeting, User } from '@/types';
import { MeetingLiveView } from './MeetingLiveView';
import {
  Mic,
  Play,
  Pause,
  Calendar,
  Users,
  Sparkles,
  FileText,
  Share2,
  Lock,
  Globe,
  ListTodo,
  ChevronDown,
  ChevronUp,
  Video,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  Building2
} from 'lucide-react';

interface MeetingsViewProps {
  meetings: Meeting[];
  currentUser: User;
  onOpenNewMeeting: () => void;
  onSelectActionTab: () => void;
  onBroadcastMeeting: (meeting: Meeting) => void;
  onMeetingsUpdated?: () => void;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({
  meetings,
  currentUser,
  onOpenNewMeeting,
  onSelectActionTab,
  onBroadcastMeeting,
  onMeetingsUpdated,
}) => {
  const [playingMeetingId, setPlayingMeetingId] = useState<string | null>(null);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL');
  const [activeLiveMeeting, setActiveLiveMeeting] = useState<Meeting | null>(null);

  // Edit Meeting State
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [editDate, setEditDate] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Meeting State
  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredMeetings = meetings.filter((m) => {
    if (filterType === 'ALL') return true;
    return m.meetingType === filterType;
  });

  const togglePlay = (id: string) => {
    setPlayingMeetingId((prev) => (prev === id ? null : id));
  };

  const toggleTranscript = (id: string) => {
    setExpandedTranscriptId((prev) => (prev === id ? null : id));
  };

  const handleOpenEdit = (m: Meeting) => {
    setEditingMeeting(m);
    setEditTitle(m.title);
    setEditDescription(m.description || '');
    setEditType(m.meetingType);
    setEditDate(m.meetingDate ? m.meetingDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditDepartment(m.department || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting || !editTitle.trim()) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/meetings/${editingMeeting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          meetingType: editType,
          meetingDate: new Date(editDate).toISOString(),
          department: editDepartment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update meeting');
      }

      setEditingMeeting(null);
      onMeetingsUpdated?.();
    } catch (err) {
      console.error('Save meeting error:', err);
      alert(err instanceof Error ? err.message : 'Error updating meeting');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!deletingMeeting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/meetings/${deletingMeeting.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete meeting');
      }

      setDeletingMeeting(null);
      onMeetingsUpdated?.();
    } catch (err) {
      console.error('Delete meeting error:', err);
      alert(err instanceof Error ? err.message : 'Error deleting meeting');
    } finally {
      setIsDeleting(false);
    }
  };

  const isPrivileged = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Meetings & Voice Transcripts</h2>
          <p className="text-xs text-slate-500">
            Recorded audio sessions processed with Gemini multimodal models for autonomous action point extraction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Internal vs External Filter */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({meetings.length})
            </button>
            <button
              onClick={() => setFilterType('INTERNAL')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                filterType === 'INTERNAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Internal
            </button>
            <button
              onClick={() => setFilterType('EXTERNAL')}
              className={`px-3 py-1 font-semibold rounded-lg transition-all cursor-pointer ${
                filterType === 'EXTERNAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              External
            </button>
          </div>

          <button
            onClick={onOpenNewMeeting}
            className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-3.5 py-2 shadow-xs transition-all cursor-pointer"
          >
            <Mic className="h-4 w-4" />
            <span>Schedule / Record Meeting</span>
          </button>
        </div>
      </div>

      {/* Meeting Cards List */}
      <div className="space-y-4">
        {filteredMeetings.map((meeting) => {
          const isPlaying = playingMeetingId === meeting.id;
          const isTranscriptOpen = expandedTranscriptId === meeting.id;
          const isInternal = meeting.meetingType === 'INTERNAL';
          const canManage = isPrivileged || meeting.createdById === currentUser.id;

          return (
            <div
              key={meeting.id}
              className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              {/* Meeting Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        isInternal
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200/70'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                      }`}
                    >
                      {isInternal ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                      {meeting.meetingType} MEETING
                    </span>

                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(meeting.meetingDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      {meeting.participants.length} Participants
                    </span>

                    {meeting.department && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Building2 className="h-3.5 w-3.5" />
                        {meeting.department}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{meeting.title}</h3>
                  {meeting.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">{meeting.description}</p>
                  )}
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-1.5 self-start">
                  <button
                    onClick={() => setActiveLiveMeeting(meeting)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white shadow transition-all cursor-pointer"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>In-Meeting Live Studio</span>
                  </button>

                  <button
                    onClick={() => onBroadcastMeeting(meeting)}
                    title={isInternal ? 'Send meeting minutes to invited internal staff' : 'Broadcast to all attendees'}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>Broadcast</span>
                  </button>

                  {canManage && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(meeting)}
                        title="Edit meeting details"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-sky-600 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingMeeting(meeting)}
                        title="Delete meeting"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Audio Simulation Player */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200/70 p-2.5">
                <button
                  onClick={() => togglePlay(meeting.id)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold text-white transition-all shadow-xs cursor-pointer ${
                    isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span className="flex items-center gap-1">
                      <Mic className="h-3 w-3 text-sky-600" />
                      {isPlaying ? 'Playing Audio Recording...' : 'Voice Recording Track'}
                    </span>
                    <span>
                      {meeting.audioDuration ? `${Math.floor(meeting.audioDuration / 60)}m ${meeting.audioDuration % 60}s` : '18m 45s'}
                    </span>
                  </div>

                  {/* Audio Waveform Simulator */}
                  <div className="flex items-center gap-0.5 h-4 w-full overflow-hidden">
                    {[40, 65, 80, 50, 90, 75, 45, 60, 85, 95, 70, 55, 60, 80, 45, 90, 100, 65, 50, 40, 70, 85, 60, 45, 80, 90, 75, 60, 40, 65, 50, 70].map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          isPlaying ? 'bg-sky-500 animate-pulse' : 'bg-slate-300'
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              {meeting.summary && (
                <div className="rounded-xl bg-indigo-50/50 border border-indigo-100/70 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Gemini AI Executive Summary</span>
                  </div>
                  <p className="text-xs text-indigo-950/80 leading-relaxed">{meeting.summary}</p>
                </div>
              )}

              {/* Participants list tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Attendees:</span>
                {meeting.participants.map((p) => (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                      p.type === 'EXTERNAL'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {p.name}
                    {p.type === 'EXTERNAL' && <span className="text-[9px] font-bold text-amber-600">(Guest)</span>}
                  </span>
                ))}
              </div>

              {/* Extracted Action Items Count & Transcript Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <ListTodo className="h-3.5 w-3.5 text-indigo-600" />
                    {meeting.actionItems.length} Delegated Action Points
                  </span>
                  <button
                    onClick={onSelectActionTab}
                    className="text-sky-600 hover:underline font-semibold cursor-pointer"
                  >
                    View on board &rarr;
                  </button>
                </div>

                {meeting.transcript && (
                  <button
                    onClick={() => toggleTranscript(meeting.id)}
                    className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{isTranscriptOpen ? 'Hide Full Transcript' : 'Inspect Full Transcript'}</span>
                    {isTranscriptOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {/* Collapsible Transcript Display */}
              {isTranscriptOpen && meeting.transcript && (
                <div className="rounded-xl bg-slate-900 p-4 text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {meeting.transcript}
                </div>
              )}
            </div>
          );
        })}

        {filteredMeetings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Mic className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No meetings found under this filter</p>
            <p className="text-xs text-slate-500 mt-1">Record a new voice session or schedule a meeting.</p>
          </div>
        )}
      </div>

      {/* Edit Meeting Modal */}
      {editingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Meeting Details</h3>
              <button
                onClick={() => setEditingMeeting(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Meeting Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as 'INTERNAL' | 'EXTERNAL')}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="INTERNAL">Internal Meeting</option>
                    <option value="EXTERNAL">External Meeting</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Department</label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="e.g. Engineering, Sales, Executive"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMeeting(null)}
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

      {/* Delete Meeting Modal */}
      {deletingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Meeting?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete &quot;{deletingMeeting.title}&quot;? All associated transcript data and action points will be removed.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMeeting(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMeeting}
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

      {/* Live Meeting Modal */}
      {activeLiveMeeting && (
        <MeetingLiveView
          meeting={activeLiveMeeting}
          currentUser={currentUser}
          onClose={() => setActiveLiveMeeting(null)}
          onMeetingUpdated={(updated) => {
            setActiveLiveMeeting(updated);
            onMeetingsUpdated?.();
          }}
        />
      )}
    </div>
  );
};
