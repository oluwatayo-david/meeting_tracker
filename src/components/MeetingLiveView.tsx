'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Meeting, TranscriptSegment, ActionItem, User } from '@/types';
import { RecordingPanel } from './RecordingPanel';
import { TranscriptViewer } from './TranscriptViewer';
import { ActionPointsEditor } from './ActionPointsEditor';
import {
  X,
  Users,
  Calendar,
  Globe,
  Lock,
  Sparkles,
  ChevronRight,
  Loader2,
  Mic,
  FileText
} from 'lucide-react';

interface MeetingLiveViewProps {
  meeting: Meeting;
  currentUser: User;
  onClose: () => void;
  onMeetingUpdated: (meeting: Meeting) => void;
}

type ViewPanel = 'recording' | 'transcript' | 'actions';

export function MeetingLiveView({ meeting, currentUser, onClose, onMeetingUpdated }: MeetingLiveViewProps) {
  const [activePanel, setActivePanel] = useState<ViewPanel>(
    meeting.transcript ? (meeting.actionItems?.length ? 'actions' : 'transcript') : 'recording'
  );
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>(() => {
    if (!meeting.transcript) return [];
    return meeting.transcript
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line, idx) => ({
        text: line.trim(),
        timestamp: idx * 15,
        isHighlight:
          line.toLowerCase().includes('action') ||
          line.toLowerCase().includes('deadline') ||
          line.toLowerCase().includes('will do') ||
          line.toLowerCase().includes('responsible'),
      }));
  });
  const [rawTranscript, setRawTranscript] = useState(meeting.transcript || '');
  const [actionItems, setActionItems] = useState<ActionItem[]>(meeting.actionItems || []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedSummary, setAnalyzedSummary] = useState(meeting.summary || '');
  const [hasRecording, setHasRecording] = useState(Boolean(meeting.transcript));

  useEffect(() => {
    if (meeting.transcript) {
      setRawTranscript(meeting.transcript);
      setHasRecording(true);
    }
    if (meeting.summary) {
      setAnalyzedSummary(meeting.summary);
    }
    if (meeting.actionItems) {
      setActionItems(meeting.actionItems);
    }
  }, [meeting]);

  const handleTranscriptUpdate = useCallback((segments: TranscriptSegment[], raw: string) => {
    setTranscriptSegments(segments);
    setRawTranscript(raw);
  }, []);

  const handleRecordingComplete = useCallback(
    async (audioBlob: Blob, transcript: string, audioBase64?: string, mimeType?: string) => {
      setHasRecording(true);
      setRawTranscript(transcript);
      setActivePanel('actions');
      setIsAnalyzing(true);

      try {
        const res = await fetch('/api/meetings/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId: meeting.id,
            transcript: transcript.trim(),
            audioBase64,
            audioMimeType: mimeType || 'audio/webm',
            meetingTitle: meeting.title,
            participants: meeting.participants,
          }),
        });

        const data = await res.json();
        if (data.transcript) {
          setRawTranscript(data.transcript);
          // Split into segments if empty
          if (transcriptSegments.length === 0) {
            const newSegs: TranscriptSegment[] = data.transcript
              .split('\n')
              .filter((l: string) => l.trim().length > 0)
              .map((l: string, i: number) => ({
                text: l.trim(),
                timestamp: i * 10,
                isHighlight: l.toLowerCase().includes('action') || l.toLowerCase().includes('will do'),
              }));
            setTranscriptSegments(newSegs);
          }
        }
        if (data.summary) {
          setAnalyzedSummary(data.summary);
        }
        if (data.actionItems) {
          setActionItems(data.actionItems);
        }

        const updatedMeeting: Meeting = data.meeting || {
          ...meeting,
          transcript: data.transcript || transcript,
          summary: data.summary || analyzedSummary,
          actionItems: data.actionItems || actionItems,
        };

        onMeetingUpdated(updatedMeeting);
      } catch (err) {
        console.error('Gemini live analysis failed:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [meeting, onMeetingUpdated, transcriptSegments.length, analyzedSummary, actionItems]
  );

  const panels: { id: ViewPanel; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'recording', label: 'Recording', icon: Mic },
    { id: 'transcript', label: 'Transcript', icon: FileText, badge: transcriptSegments.length },
    { id: 'actions', label: 'Action Points', icon: Sparkles, badge: actionItems.length },
  ];

  const isExternal = meeting.meetingType === 'EXTERNAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isExternal ? 'bg-amber-400' : 'bg-violet-400'}`} />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">{meeting.title}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  {isExternal ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {meeting.meetingType}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(meeting.meetingDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {meeting.participants.length} attendees
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visibility banner */}
        <div
          className={`px-6 py-2 text-xs font-medium flex items-center gap-2 shrink-0 ${
            isExternal
              ? 'bg-amber-500/10 border-b border-amber-500/20 text-amber-300'
              : 'bg-violet-500/10 border-b border-violet-500/20 text-violet-300'
          }`}
        >
          {isExternal ? (
            <>
              <Globe className="h-3.5 w-3.5" /> External meeting — all department members can see this meeting and its summary
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" /> Internal meeting — only invited participants can view this meeting
            </>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-700 shrink-0">
          {panels.map((panel, i) => {
            const Icon = panel.icon;
            const isActive = activePanel === panel.id;
            return (
              <React.Fragment key={panel.id}>
                <button
                  type="button"
                  onClick={() => setActivePanel(panel.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {panel.label}
                  {panel.badge !== undefined && panel.badge > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] flex items-center justify-center font-bold ${
                        isActive ? 'bg-white/20' : 'bg-slate-600'
                      }`}
                    >
                      {panel.badge}
                    </span>
                  )}
                </button>
                {i < panels.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-600" />}
              </React.Fragment>
            );
          })}

          {isAnalyzing && (
            <div className="ml-auto flex items-center gap-2 text-xs text-violet-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              AI processing meeting & action points...
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activePanel === 'recording' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <RecordingPanel
                meetingId={meeting.id}
                meetingTitle={meeting.title}
                initialTranscript={rawTranscript}
                onTranscriptUpdate={handleTranscriptUpdate}
                onRecordingComplete={handleRecordingComplete}
              />

              {/* Participants list */}
              <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Attendees ({meeting.participants.length})
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {meeting.participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          p.type === 'EXTERNAL'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-violet-500/20 text-violet-300'
                        }`}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500">{p.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {hasRecording && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setActivePanel('transcript')}
                    className="flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                  >
                    View AI Analysis & Transcript <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {activePanel === 'transcript' && (
            <div className="max-w-3xl mx-auto">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-violet-600/20 border-t-violet-600 animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-violet-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">AI is analyzing your meeting...</p>
                    <p className="text-xs text-slate-400 mt-1">Extracting key topics, decisions & action points</p>
                  </div>
                </div>
              ) : (
                <TranscriptViewer
                  segments={transcriptSegments}
                  rawTranscript={rawTranscript}
                  summary={analyzedSummary}
                  actionItems={actionItems}
                />
              )}
            </div>
          )}

          {activePanel === 'actions' && (
            <div className="max-w-3xl mx-auto">
              <ActionPointsEditor
                meeting={meeting}
                actionItems={actionItems}
                onItemsUpdated={(items) => {
                  setActionItems(items);
                  onMeetingUpdated({ ...meeting, actionItems: items });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
