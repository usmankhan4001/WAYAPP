'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mic,
  Camera,
  CheckCircle2,
  AlertCircle,
  Shield,
  X,
  Sparkles,
  RefreshCw,
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

    // Check localStorage cache if previously granted
    if (localStorage.getItem('wayapp_mic_granted') === 'true' && micStatus !== 'denied') {
      setMicStatus('granted');
    }
    if (localStorage.getItem('wayapp_camera_granted') === 'true' && cameraStatus !== 'denied') {
      setCameraStatus('granted');
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      setErrorMessage(null);
    }
  }, [isOpen]);

  // 1. Request Notification Permission
  const handleRequestNotification = async () => {
    setErrorMessage(null);
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
      setErrorMessage('Notifications are not supported in this browser. If on mobile, install app to home screen first.');
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
      setErrorMessage('Microphone access is not supported by your browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('granted');
      localStorage.setItem('wayapp_mic_granted', 'true');
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      setMicStatus('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission was blocked. Click the lock/settings icon in your browser address bar to allow Microphone.');
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
      setErrorMessage('Camera access is not supported by your browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStatus('granted');
      localStorage.setItem('wayapp_camera_granted', 'true');
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      setCameraStatus('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was blocked. Click the lock/settings icon in your browser address bar to allow Camera.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device found on this system.');
      } else {
        setErrorMessage(err.message || 'Failed to access camera.');
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
        localStorage.setItem('wayapp_mic_granted', 'true');
        localStorage.setItem('wayapp_camera_granted', 'true');
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        // Attempt mic only
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicStatus('granted');
          localStorage.setItem('wayapp_mic_granted', 'true');
          micStream.getTracks().forEach((t) => t.stop());
        } catch {}

        // Attempt camera only
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraStatus('granted');
          localStorage.setItem('wayapp_camera_granted', 'true');
          camStream.getTracks().forEach((t) => t.stop());
        } catch {}
      }
    }

    setIsRequesting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black/5 text-emerald-600 flex items-center justify-center font-normal  ring-1 ring-emerald-100 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-normal text-slate-900 leading-tight">Device Permissions Center</h3>
              <p className="text-[11px] text-slate-500">Enable real-time alerts, mic voice notes & camera</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Permissions Cards */}
        <div className="space-y-2.5">
          {/* 1. Notifications */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-black/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-normal text-slate-900">Notifications</h4>
                  {notificationStatus === 'granted' ? (
                    <span className="text-[10px] font-normal text-[#1c1e21] bg-[#e6ffda] px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : notificationStatus === 'denied' ? (
                    <span className="text-[10px] font-normal text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">WhatsApp incoming message desktop alerts</p>
              </div>
            </div>

            {notificationStatus !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestNotification}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-normal text-xs  shrink-0 transition-all active:scale-95"
              >
                Enable
              </button>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
          </div>

          {/* 2. Microphone */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-black/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-black/5 text-emerald-600 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-normal text-slate-900">Microphone</h4>
                  {micStatus === 'granted' ? (
                    <span className="text-[10px] font-normal text-[#1c1e21] bg-[#e6ffda] px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : micStatus === 'denied' ? (
                    <span className="text-[10px] font-normal text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">Record & send WhatsApp audio voice notes</p>
              </div>
            </div>

            {micStatus !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestMicrophone}
                className="px-3 py-1.5 rounded-xl bg-whatsapp-green hover:bg-[#20b858] text-white font-normal text-xs  shrink-0 transition-all active:scale-95"
              >
                Enable
              </button>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
          </div>

          {/* 3. Camera */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-black/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-normal text-slate-900">Camera</h4>
                  {cameraStatus === 'granted' ? (
                    <span className="text-[10px] font-normal text-[#1c1e21] bg-[#e6ffda] px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : cameraStatus === 'denied' ? (
                    <span className="text-[10px] font-normal text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">Take photos & record video in chat</p>
              </div>
            </div>

            {cameraStatus !== 'granted' ? (
              <button
                type="button"
                onClick={handleRequestCamera}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-normal text-xs  shrink-0 transition-all active:scale-95"
              >
                Enable
              </button>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
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
              className="w-full py-3 rounded-2xl bg-whatsapp-green hover:bg-[#20b858] text-white font-normal text-xs  shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isRequesting ? 'Requesting Permissions...' : 'Grant All Permissions in 1-Click'}</span>
            </button>
          ) : (
            <div className="p-3 bg-black/5 rounded-2xl border border-emerald-200 text-center">
              <p className="text-xs font-normal text-emerald-800 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All device permissions are active & ready!
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-normal transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
