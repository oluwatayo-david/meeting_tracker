'use client';

import React, { useState, useEffect } from 'react';
import { User, MeetingType } from '@/types';
import { 
  Calendar, 
  Clock, 
  Lock, 
  Globe, 
  Users, 
  FileText, 
  X, 
  Check, 
  Send,
  Sparkles,
  Building2,
  Mail,
  Plus
} from 'lucide-react';
import { DEPARTMENTS } from '@/lib/departments';

interface NewMeetingModalProps {
  currentUser: User;
  users?: User[];
  onClose: () => void;
  onCreateMeeting: (meetingData: {
    title: string;
    description: string;
    meetingType: MeetingType;
    meetingDate: string;
    department?: string;
    transcript: string;
    participants: { name: string; email: string; type: 'INTERNAL' | 'EXTERNAL'; userId?: string }[];
  }) => Promise<void>;
}

export const NewMeetingModal: React.FC<NewMeetingModalProps> = ({
  currentUser,
  users: initialUsers,
  onClose,
  onCreateMeeting,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>('INTERNAL');
  const [meetingDate, setMeetingDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [department, setDepartment] = useState(currentUser.department || 'Engineering');
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>(initialUsers || []);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([currentUser.id]);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [newParticipantName, setNewParticipantName] = useState('');
  const [customParticipants, setCustomParticipants] = useState<{ name: string; email: string; type: 'INTERNAL' | 'EXTERNAL'; userId?: string }[]>([]);

  // Fetch registered users from API if not passed in
  useEffect(() => {
    if (!initialUsers || initialUsers.length === 0) {
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          if (data.users && Array.isArray(data.users)) {
            setAvailableUsers(data.users);
          }
        })
        .catch((err) => console.error('Failed to load team members:', err));
    }
  }, [initialUsers]);

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(uId => uId !== id) : [...prev, id]
    );
  };

  const handleAddCustomParticipant = () => {
    if (!newParticipantEmail.trim() || !newParticipantName.trim()) return;
    setCustomParticipants(prev => [
      ...prev,
      {
        name: newParticipantName.trim(),
        email: newParticipantEmail.trim().toLowerCase(),
        type: meetingType,
      }
    ]);
    setNewParticipantName('');
    setNewParticipantEmail('');
  };

  const handleRemoveCustomParticipant = (idx: number) => {
    setCustomParticipants(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsProcessing(true);
    try {
      // Build selected internal participants from DB users
      const selectedDbParticipants = availableUsers
        .filter(u => selectedUserIds.includes(u.id))
        .map(u => ({
          name: u.name,
          email: u.email,
          userId: u.id,
          type: 'INTERNAL' as const,
        }));

      // Merge with custom invitees
      const allParticipants = [
        ...selectedDbParticipants,
        ...customParticipants,
      ];

      // Ensure at least currentUser is included
      if (!allParticipants.some(p => p.email === currentUser.email)) {
        allParticipants.unshift({
          name: currentUser.name,
          email: currentUser.email,
          userId: currentUser.id,
          type: 'INTERNAL' as const,
        });
      }

      await onCreateMeeting({
        title: title.trim(),
        description: description.trim(),
        meetingType,
        meetingDate: new Date(meetingDate).toISOString(),
        department,
        transcript: '', // AI transcription runs inside the live meeting session
        participants: allParticipants,
      });
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="flex flex-col max-h-[92vh] w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-sky-600/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Schedule & Create Meeting</h3>
              <p className="text-xs text-slate-500">Set agenda, invite staff, and launch live recording session</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Meeting Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Meeting Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              placeholder="e.g. Q4 Primary Health Delivery & Telemetry Sync"
            />
          </div>

          {/* Date & Department Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Scheduled Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description / Agenda */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Meeting Agenda & Objectives <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              placeholder="Outline discussion points and expected outcomes..."
            />
          </div>

          {/* Permission / Routing Toggle (Internal vs External) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Meeting Classification & Permissions</label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setMeetingType('INTERNAL')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  meetingType === 'INTERNAL'
                    ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-indigo-950">
                  <Lock className="h-4 w-4 text-indigo-600" />
                  <span>Internal Meeting</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Confidential session. Action items and task workspaces are restricted to assigned internal team members.
                </p>
              </div>

              <div
                onClick={() => setMeetingType('EXTERNAL')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  meetingType === 'EXTERNAL'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-950">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  <span>External / Partner</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Partner or consortium session. Allows inviting external attendees with public minute dissemination.
                </p>
              </div>
            </div>
          </div>

          {/* Attendees Multi-select */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-600" />
                Select Staff Attendees ({selectedUserIds.length} selected)
              </span>
              <span className="text-[10px] text-slate-500">From registered workspace members</span>
            </label>
            
            {availableUsers.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {availableUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-sky-400" />}
                      <span>{u.name}</span>
                      <span className="text-[10px] opacity-75">({u.role})</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                You are currently the only team member in the workspace. Onboard others from the Team Panel.
              </p>
            )}

            {/* Add external or custom participant */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Invite Additional Attendee by Email:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={newParticipantEmail}
                  onChange={(e) => setNewParticipantEmail(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomParticipant}
                  disabled={!newParticipantName || !newParticipantEmail}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-40 transition-colors"
                >
                  Add
                </button>
              </div>

              {customParticipants.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {customParticipants.map((cp, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-900 text-xs"
                    >
                      <span>{cp.name} ({cp.email})</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveCustomParticipant(idx)}
                        className="text-sky-600 hover:text-rose-600 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-center gap-3 text-xs text-slate-600">
            <Sparkles className="h-4 w-4 text-sky-600 shrink-0" />
            <p>
              When you open the meeting room and click <strong>Start Recording</strong>, speech is transcribed and action points are extracted into the board automatically.
            </p>
          </div>

          {/* Footer CTAs */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !title.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-cyan-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>{isProcessing ? 'Creating Session & Sending Invites...' : 'Create Meeting & Send Invites'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
