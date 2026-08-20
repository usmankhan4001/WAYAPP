'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Mic,
  Camera,
  CheckCircle2,
  AlertCircle,
  Shield,
  Smartphone,
  X,
  RefreshCw,
  Sparkles,
  Volume2,
  Video,
  Eye,
  EyeOff,
} from 'lucide-react';

interface DevicePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function DevicePermissionsModal({ isOpen, onClose }: DevicePermissionsModalProps) {
  const [notificationStatus, setNotificationStatus] = useState<PermissionStatus>('prompt');
  const [micStatus, setMicStatus] = useState<PermissionStatus>('prompt');
  const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('prompt');
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live hardware preview state
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const checkStatus = async () => {
    if (typeof window === 'undefined') return;

    // 1. Notification Permission Check
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
    } else {
      setNotificationStatus(Notification.permission as PermissionStatus);
    }

    // 2. Safe check via Permissions API if available in browser
    if (typeof navigator !== 'undefined' && navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const notifQuery = await navigator.permissions.query({ name: 'notifications' as any });
        setNotificationStatus(notifQuery.state as PermissionStatus);
        notifQuery.onchange = () => setNotificationStatus(notifQuery.state as PermissionStatus);
      } catch {}

      try {
        const micQuery = await navigator.permissions.query({ name: 'microphone' as any });
        if (micQuery) {
          setMicStatus(micQuery.state as PermissionStatus);
          micQuery.onchange = () => setMicStatus(micQuery.state as PermissionStatus);
        }
      } catch {}

      try {
        const cameraQuery = await navigator.permissions.query({ name: 'camera' as any });
        if (cameraQuery) {
          setCameraStatus(cameraQuery.state as PermissionStatus);
          cameraQuery.onchange = () => setCameraStatus(cameraQuery.state as PermissionStatus);
        }
      } catch {}
    }
  };

  const stopAllMediaStreams = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    setShowLiveCamera(false);
    setAudioLevel(0);
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      setErrorMessage(null);
    } else {
      stopAllMediaStreams();
    }
    return () => {
      stopAllMediaStreams();
    };
  }, [isOpen]);

  // 1. Request Notification Permission
  const handleRequestNotification = async () => {
    setErrorMessage(null);
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
      setErrorMessage('Notifications are not supported in this browser. If on iOS, install app to home screen first.');
      return;
    }

    try {
      let permission: NotificationPermission;
      if (Notification.requestPermission.length === 0) {
        permission = await Notification.requestPermission();
      } else {
        permission = await new Promise((resolve) => {
          Notification.requestPermission((p) => resolve(p));
        });
      }

      setNotificationStatus(permission as PermissionStatus);

      if (permission === 'granted') {
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('WAYAPP Notifications Active', {
              body: 'Real-time customer WhatsApp alerts are enabled on this device.',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
            });
          } else {
            new Notification('WAYAPP Notifications Active', {
              body: 'Real-time customer WhatsApp alerts are enabled on this device.',
              icon: '/icon-192.png',
            });
          }
        } catch {}
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not request notification permission.');
    }
  };

  // 2. Request Microphone Permission (Immediate User Gesture)
  const handleRequestMicrophone = async () => {
    setErrorMessage(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicStatus('unsupported');
      setErrorMessage('Microphone access is not supported by your browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('granted');

      // Start a brief 3-second audio level visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          src.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (!audioContextRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateAudioLevel);
          };
          updateAudioLevel();

          setTimeout(() => {
            stream.getTracks().forEach((t) => t.stop());
            if (audioContextRef.current) {
              audioContextRef.current.close().catch(() => {});
              audioContextRef.current = null;
            }
            setAudioLevel(0);
          }, 4000);
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (err: any) {
      setMicStatus('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission was blocked. Please click the permissions/lock icon in your browser URL bar to allow microphone access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No microphone device found on this system.');
      } else {
        setErrorMessage(err.message || 'Failed to access microphone.');
      }
    }
  };

  // 3. Request Camera Permission (Immediate User Gesture)
  const handleRequestCamera = async () => {
    setErrorMessage(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('unsupported');
      setErrorMessage('Camera access is not supported by your browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      setCameraStatus('granted');
      activeStreamRef.current = stream;
      setShowLiveCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      // Fallback attempt with minimal constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStatus('granted');
        activeStreamRef.current = fallbackStream;
        setShowLiveCamera(true);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (fallbackErr: any) {
        setCameraStatus('denied');
        if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
          setErrorMessage('Camera permission was blocked. Please click the permissions/lock icon in your browser URL bar to allow camera access.');
        } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
          setErrorMessage('No camera device found on this system.');
        } else {
          setErrorMessage(fallbackErr.message || 'Failed to access camera.');
        }
      }
    }
  };

  // 4. Grant All (Direct Combined Media Gesture)
  const handleGrantAll = async () => {
    setIsRequesting(true);
    setErrorMessage(null);

    // Request notification first
    if ('Notification' in window && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
        setNotificationStatus(Notification.permission as PermissionStatus);
      } catch {}
    }

    // Request Combined Media in direct turn
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMicStatus('granted');
        setCameraStatus('granted');
        activeStreamRef.current = stream;
        setShowLiveCamera(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (combinedErr) {
        // Attempt mic only
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicStatus('granted');
          micStream.getTracks().forEach((t) => t.stop());
        } catch {}

        // Attempt camera only
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraStatus('granted');
          activeStreamRef.current = camStream;
          setShowLiveCamera(true);
          if (videoRef.current) {
            videoRef.current.srcObject = camStream;
            videoRef.current.play().catch(() => {});
          }
        } catch {}
      }
    }

    setIsRequesting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold shadow-sm ring-1 ring-emerald-500/20 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Device Permissions Center</h3>
              <p className="text-[11px] text-slate-400">Enable real-time alerts, mic voice notes & camera</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Live Camera Test Preview */}
        {showLiveCamera && (
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 animate-pulse" />
                Live Camera Connected
              </span>
              <button
                type="button"
                onClick={stopAllMediaStreams}
                className="text-[10px] text-slate-400 hover:text-slate-200"
              >
                Turn off preview
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            </div>
          </div>
        )}

        {/* Live Audio Meter */}
        {audioLevel > 0 && (
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 animate-bounce" />
                Microphone Audio Input Detected
              </span>
              <span className="font-mono text-emerald-400">{audioLevel}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
        )}

        {/* Permissions Cards */}
        <div className="space-y-2.5">
          {/* 1. Notifications */}
          <div className="p-3 rounded-2xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white">Notifications</h4>
                  {notificationStatus === 'granted' ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                      Active
                    </span>
                  ) : notificationStatus === 'denied' ? (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800/60">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/60">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">WhatsApp incoming message desktop alerts</p>
              </div>
            </div>

            {notificationStatus !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestNotification}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm shrink-0 transition-all active:scale-95"
              >
                Enable
              </button>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
          </div>

          {/* 2. Microphone */}
          <div className="p-3 rounded-2xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white">Microphone</h4>
                  {micStatus === 'granted' ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                      Active
                    </span>
                  ) : micStatus === 'denied' ? (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800/60">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/60">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">Record & send WhatsApp audio voice notes</p>
              </div>
            </div>

            {micStatus !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestMicrophone}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm shrink-0 transition-all active:scale-95"
              >
                Enable
              </button>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
          </div>

          {/* 3. Camera */}
          <div className="p-3 rounded-2xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white">Camera</h4>
                  {cameraStatus === 'granted' ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                      Active
                    </span>
                  ) : cameraStatus === 'denied' ? (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800/60">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/60">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">Take photos & record video in chat</p>
              </div>
            </div>

            {cameraStatus !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestCamera}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm shrink-0 transition-all active:scale-95"
              >
                Enable
              </button>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-2 pt-2">
          {notificationStatus !== 'granted' || micStatus !== 'granted' || cameraStatus !== 'granted' ? (
            <button
              type="button"
              onClick={handleGrantAll}
              disabled={isRequesting}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isRequesting ? 'Requesting Permissions...' : 'Grant All Permissions in 1-Click'}</span>
            </button>
          ) : (
            <div className="p-3 bg-emerald-950/80 rounded-2xl border border-emerald-800/60 text-center">
              <p className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                All device permissions are active & ready!
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
