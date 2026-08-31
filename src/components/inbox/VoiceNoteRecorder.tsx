'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Send, Mic, Radio } from 'lucide-react';

interface VoiceNoteRecorderProps {
  onSendVoiceNote: (file: File) => void;
  onCancel: () => void;
}

export function VoiceNoteRecorder({ onSendVoiceNote, onCancel }: VoiceNoteRecorderProps) {
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRecording();

    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')
        ? 'audio/ogg; codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm; codecs=opus')
        ? 'audio/webm; codecs=opus'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200); // 200ms slice
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setError('Microphone access denied. Please grant microphone permissions in your browser.');
    }
  };

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancel = () => {
    stopRecordingCleanup();
    onCancel();
  };

  const handleSend = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      onCancel();
      return;
    }

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'audio/ogg';
      const ext = mimeType.includes('webm') ? '.webm' : mimeType.includes('mp4') ? '.mp4' : '.ogg';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const audioFile = new File([audioBlob], `voice_note_${Date.now()}${ext}`, { type: mimeType });

      onSendVoiceNote(audioFile);
    };

    stopRecordingCleanup();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (error) {
    return (
      <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
        <span>{error}</span>
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 rounded bg-rose-200 hover:bg-rose-300 text-rose-900 font-bold"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-md bg-slate-900 text-white flex items-center justify-between gap-3 shadow-lg border border-slate-800 animate-in fade-in slide-in-from-bottom duration-200">
      {/* Recording Indicator & Timer */}
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
        <span className="text-xs font-mono font-bold">{formatTime(recordingTime)}</span>

        {/* Animated wave sound bars */}
        <div className="hidden sm:flex items-center gap-1">
          <div className="w-1 bg-emerald-400 rounded-full h-3 animate-pulse" />
          <div className="w-1 bg-emerald-400 rounded-full h-5 animate-pulse delay-75" />
          <div className="w-1 bg-emerald-400 rounded-full h-2 animate-pulse delay-150" />
          <div className="w-1 bg-emerald-400 rounded-full h-4 animate-pulse delay-100" />
          <div className="w-1 bg-emerald-400 rounded-full h-6 animate-pulse delay-200" />
        </div>

        <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
          Recording WhatsApp Voice Note...
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 transition-all"
          title="Delete recording"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleSend}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
