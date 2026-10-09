'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Radio,
  Volume2,
  Sparkles,
  FileText,
  AlertCircle,
  UploadCloud,
  FileAudio,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { RecordingState, TranscriptSegment } from '@/types';

// Browser Speech Recognition API types
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionType;
    webkitSpeechRecognition: new () => SpeechRecognitionType;
  }
}

type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorResult) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: {
    isFinal: boolean;
    length: number;
    0: { transcript: string };
    [key: number]: { transcript: string };
  }[];
};

type SpeechRecognitionErrorResult = {
  error: string;
  message?: string;
};

interface RecordingPanelProps {
  meetingId: string;
  meetingTitle: string;
  initialTranscript?: string;
  onTranscriptUpdate: (segments: TranscriptSegment[], rawText: string) => void;
  onRecordingComplete: (audioBlob: Blob, transcript: string, audioBase64?: string, mimeType?: string) => void;
}

export function RecordingPanel({
  meetingId,
  meetingTitle,
  initialTranscript = '',
  onTranscriptUpdate,
  onRecordingComplete,
}: RecordingPanelProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [liveText, setLiveText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [speechApiSupported, setSpeechApiSupported] = useState(true);
  const [manualNotes, setManualNotes] = useState(initialTranscript);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'mic' | 'upload' | 'manual'>('mic');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const transcriptRef = useRef<string>(initialTranscript);
  const segmentsRef = useRef<TranscriptSegment[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll transcript window
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, liveText]);

  // Check speech recognition support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
      setSpeechApiSupported(hasSpeech);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const trackAudioLevel = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!isRecordingRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, Math.round(avg * 2.8)));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn('Audio meter initialization skipped:', e);
    }
  }, []);

  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognitionClass: (new () => SpeechRecognitionType) | undefined =
      (window as Window & typeof globalThis).SpeechRecognition ||
      (window as Window & typeof globalThis).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechApiSupported(false);
      return;
    }

    try {
      // Abort any lingering instance
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;

      recognition.onresult = (event: SpeechRecognitionResultEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]) {
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }
        }

        if (finalTranscript.trim()) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const cleaned = finalTranscript.trim();
          const newSegment: TranscriptSegment = {
            text: cleaned,
            timestamp: elapsed,
            isHighlight: cleaned.toLowerCase().includes('action') ||
              cleaned.toLowerCase().includes('deadline') ||
              cleaned.toLowerCase().includes('responsible') ||
              cleaned.toLowerCase().includes('will do') ||
              cleaned.toLowerCase().includes('by friday') ||
              cleaned.toLowerCase().includes('follow up'),
            highlightReason: cleaned.toLowerCase().includes('action') ? 'Action item detected' : undefined,
          };

          segmentsRef.current = [...segmentsRef.current, newSegment];
          transcriptRef.current += (transcriptRef.current ? ' ' : '') + cleaned;

          setSegments([...segmentsRef.current]);
          onTranscriptUpdate(segmentsRef.current, transcriptRef.current);
          setLiveText('');
        }

        setLiveText(interimTranscript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorResult) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition status:', event.error);
        }
      };

      recognition.onend = () => {
        // Auto-restart while recording is actively ongoing
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch {
            // Ignore collision
          }
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition launch notice:', err);
    }
  }, [onTranscriptUpdate]);

  const startRecording = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      isRecordingRef.current = true;
      trackAudioLevel(stream);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);

      startTimeRef.current = Date.now();
      setRecordingState('recording');
      setElapsedSeconds(0);

      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      startSpeechRecognition();
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Microphone permission denied. Please allow microphone access in your browser address bar.');
      } else {
        setPermissionError(`Microphone setup error: ${error.message}`);
      }
    }
  };

  const pauseRecording = () => {
    isRecordingRef.current = false;
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      recognitionRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingState('paused');
      cancelAnimationFrame(animFrameRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      isRecordingRef.current = true;
      mediaRecorderRef.current.resume();
      startSpeechRecognition();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      setRecordingState('recording');
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    recognitionRef.current?.stop();
    cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    let fullTranscript = transcriptRef.current;
    if (liveText.trim()) {
      fullTranscript += (fullTranscript ? ' ' : '') + liveText.trim();
    }
    if (manualNotes.trim() && !fullTranscript.includes(manualNotes.trim())) {
      fullTranscript += (fullTranscript ? '\n\n' : '') + manualNotes.trim();
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });

        // Convert blob to base64 for Gemini AI multimodal transcription fallback
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          onRecordingComplete(blob, fullTranscript, base64Data, mimeType);
        };
        reader.onerror = () => {
          onRecordingComplete(blob, fullTranscript);
        };
        reader.readAsDataURL(blob);

        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.stop();
    } else {
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      onRecordingComplete(emptyBlob, fullTranscript);
    }

    setRecordingState('stopped');
    setAudioLevel(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const base64Audio = reader.result as string;
      const mimeType = file.type || 'audio/webm';
      setUploadingFile(false);
      onRecordingComplete(file, manualNotes || `Audio Recording: ${file.name}`, base64Audio, mimeType);
    };
    reader.onerror = () => {
      setUploadingFile(false);
      alert('Failed to read audio file.');
    };
    reader.readAsDataURL(file);
  };

  const handleManualProcess = () => {
    const fullTranscript = (transcriptRef.current ? transcriptRef.current + '\n\n' : '') + manualNotes.trim();
    const emptyBlob = new Blob([], { type: 'audio/webm' });
    onRecordingComplete(emptyBlob, fullTranscript);
    setRecordingState('stopped');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      recognitionRef.current?.stop();
      cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveMode('mic')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all ${
            activeMode === 'mic' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className="h-3.5 w-3.5" />
          <span>Live Microphone</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('upload')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all ${
            activeMode === 'upload' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UploadCloud className="h-3.5 w-3.5" />
          <span>Upload Audio File</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('manual')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all ${
            activeMode === 'manual' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Type Notes / Paste</span>
        </button>
      </div>

      {activeMode === 'mic' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 text-white space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  recordingState === 'recording'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                    : recordingState === 'paused'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  <Radio className="h-3 w-3" />
                  {recordingState === 'recording' ? 'LIVE AUDIO CAPTURE' : recordingState === 'paused' ? 'PAUSED' : 'STANDBY'}
                </span>
                <span className="text-xs font-mono text-slate-400 font-bold">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">{meetingTitle}</h3>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {recordingState === 'idle' && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-rose-600/25 transition-all active:scale-95 cursor-pointer"
                >
                  <Mic className="h-4 w-4" />
                  <span>Start Live Recording</span>
                </button>
              )}

              {recordingState === 'recording' && (
                <>
                  <button
                    type="button"
                    onClick={pauseRecording}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>End & Extract Action Items</span>
                  </button>
                </>
              )}

              {recordingState === 'paused' && (
                <>
                  <button
                    type="button"
                    onClick={resumeRecording}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Resume</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>End & Extract</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Live Audio Level Meter Bar */}
          {recordingState === 'recording' && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Volume2 className="h-3 w-3 text-sky-400" /> Microphone Input Stream
                </span>
                <span className="font-mono text-sky-400 font-bold">{audioLevel}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-400 via-indigo-400 to-rose-400 h-full transition-all duration-75"
                  style={{ width: `${Math.max(5, audioLevel)}%` }}
                />
              </div>
            </div>
          )}

          {permissionError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{permissionError}</span>
            </div>
          )}

          {!speechApiSupported && (
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-3 text-xs text-sky-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-sky-400" />
              <span>
                Browser live speech-to-text is not supported in this browser. Don&apos;t worry: your microphone audio is recorded and will be transcribed automatically when you stop.
              </span>
            </div>
          )}
        </div>
      )}

      {activeMode === 'upload' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-white space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-white">Upload Pre-recorded Meeting Audio</h3>
            <p className="text-xs text-slate-400">Supports .mp3, .wav, .m4a, .webm, .ogg files</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl p-8 text-center cursor-pointer transition-colors space-y-3 bg-slate-950/40"
          >
            {uploadingFile ? (
              <div className="flex flex-col items-center justify-center space-y-2 text-sky-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-xs font-bold">Reading and analyzing audio file...</p>
              </div>
            ) : uploadedFileName ? (
              <div className="flex flex-col items-center justify-center space-y-2 text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
                <p className="text-xs font-bold text-white">{uploadedFileName}</p>
                <p className="text-[11px] text-slate-400">Click to choose a different file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                <FileAudio className="h-8 w-8 text-sky-400" />
                <p className="text-xs font-bold text-slate-200">Click to browse or drag & drop meeting audio</p>
                <p className="text-[10px] text-slate-500">Audio is transcribed and action points extracted automatically</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Transcript Stream */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-sky-400" /> Live Speech Transcription
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            {segments.length} segment{segments.length === 1 ? '' : 's'} captured
          </span>
        </div>

        {/* Speech segments stream */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-[140px] max-h-[220px]">
          {segments.length === 0 && !liveText && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs space-y-1">
              <Mic className="h-6 w-6 text-slate-500" />
              <p className="font-semibold text-slate-300">Ready for speech input</p>
              <p className="text-[11px] text-slate-400">
                {activeMode === 'mic'
                  ? 'Click "Start Live Recording" and speak clearly.'
                  : activeMode === 'upload'
                  ? 'Upload an audio file above to transcribe it.'
                  : 'Type or paste meeting minutes below and click Process.'}
              </p>
            </div>
          )}

          {segments.map((seg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl text-xs leading-relaxed border transition-all ${
                seg.isHighlight
                  ? 'bg-indigo-950/50 border-indigo-600/70 text-indigo-100 shadow-sm'
                  : 'bg-slate-800/80 border-slate-700/70 text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-mono">
                <span>Segment #{idx + 1}</span>
                <span>{formatTime(seg.timestamp)}</span>
              </div>
              <p>{seg.text}</p>
            </div>
          ))}

          {liveText && (
            <div className="p-3 rounded-xl text-xs bg-sky-950/40 border border-sky-500/50 text-sky-200 italic animate-pulse">
              <span className="text-[10px] font-mono text-sky-400 not-italic block mb-0.5">Listening live...</span>
              &quot;{liveText}&quot;
            </div>
          )}

          <div ref={transcriptEndRef} />
        </div>

        {/* Direct Notes / Paste Input */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Meeting notes & discussion points:</span>
            {manualNotes.trim() && recordingState === 'idle' && (
              <button
                type="button"
                onClick={handleManualProcess}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" /> Process with AI
              </button>
            )}
          </div>
          <textarea
            rows={2}
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            placeholder="Type key points or paste meeting transcript (e.g. John will implement the user dashboard by Friday...)"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>
    </div>
  );
}
