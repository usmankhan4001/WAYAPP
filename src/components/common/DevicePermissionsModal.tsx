'use client';

import React, { useState, useEffect } from 'react';
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
  const [isRequestingAll, setIsRequestingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'permissions' | 'test'>('permissions');
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const checkAll = async () => {
    if (typeof window === 'undefined') return;

    // 1. Notification Permission Check
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
    } else {
      setNotificationStatus(Notification.permission as PermissionStatus);
    }

    // 2. Safe check for Media permissions via Permissions API if available
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
      } catch {
        // Permissions query for microphone is not supported in Safari/Firefox - fallback
      }

      try {
        const cameraQuery = await navigator.permissions.query({ name: 'camera' as any });
        if (cameraQuery) {
          setCameraStatus(cameraQuery.state as PermissionStatus);
          cameraQuery.onchange = () => setCameraStatus(cameraQuery.state as PermissionStatus);
        }
      } catch {
        // Permissions query for camera is not supported in Safari/Firefox - fallback
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkAll();
    } else {
      // Clean up stream if open
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
        setPreviewStream(null);
      }
    }
  }, [isOpen]);

  const requestNotification = async () => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      alert('Notifications are not supported by this browser. (On iOS, add WAYAPP to Home Screen first)');
      setNotificationStatus('unsupported');
      return;
    }

    try {
      let permission: NotificationPermission;
      // Some older Safari versions require callback syntax
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
              icon: '/favicon.svg',
              badge: '/favicon.svg',
            });
          } else {
            new Notification('WAYAPP Notifications Active', {
              body: 'Real-time customer WhatsApp alerts are enabled on this device.',
              icon: '/favicon.svg',
            });
          }
        } catch {
          new Notification('WAYAPP Notifications Active', {
            body: 'Real-time customer WhatsApp alerts are enabled on this device.',
            icon: '/favicon.svg',
          });
        }
      }
    } catch (err: any) {
      console.warn('[Permissions] Notification error:', err);
    }
  };

  const requestMicrophone = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Microphone access is not supported in this browser environment.');
      setMicStatus('unsupported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('granted');
      // Release stream tracks immediately
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      console.warn('[Permissions] Mic error:', err);
      setMicStatus('denied');
      alert('Microphone access was blocked. Please click the lock or settings icon in your browser address bar and enable Microphone.');
    }
  };

  const requestCamera = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera access is not supported in this browser environment.');
      setCameraStatus('unsupported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      setCameraStatus('granted');
      // Release stream tracks immediately
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      console.warn('[Permissions] Camera error:', err);
      setCameraStatus('denied');
      alert('Camera access was blocked. Please click the lock or settings icon in your browser address bar and enable Camera.');
    }
  };

  const requestAllPermissions = async () => {
    setIsRequestingAll(true);
    try {
      await requestNotification();
      await requestMicrophone();
      await requestCamera();
    } finally {
      setIsRequestingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-sm ring-1 ring-emerald-500/10 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">Device Permissions</h3>
              <p className="text-xs text-slate-500">Enable features for WhatsApp live chatting & notifications</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permissions List */}
        <div className="space-y-3">
          {/* Notification Permission Card */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-900 truncate">Push Notifications</h4>
                  {notificationStatus === 'granted' ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : notificationStatus === 'denied' ? (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">Real-time alerts for customer WhatsApp replies</p>
              </div>
            </div>

            {notificationStatus !== 'granted' ? (
              <button
                type="button"
                onClick={requestNotification}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm shrink-0 transition-all active:scale-95"
              >
                Allow
              </button>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
          </div>

          {/* Microphone Permission Card */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-900 truncate">Microphone</h4>
                  {micStatus === 'granted' ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : micStatus === 'denied' ? (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">Record & send WhatsApp voice notes</p>
              </div>
            </div>

            {micStatus !== 'granted' ? (
              <button
                type="button"
                onClick={requestMicrophone}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm shrink-0 transition-all active:scale-95"
              >
                Allow
              </button>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
          </div>

          {/* Camera Permission Card */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-900 truncate">Camera</h4>
                  {cameraStatus === 'granted' ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : cameraStatus === 'denied' ? (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">Capture instant photos/videos in chat</p>
              </div>
            </div>

            {cameraStatus !== 'granted' ? (
              <button
                type="button"
                onClick={requestCamera}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm shrink-0 transition-all active:scale-95"
              >
                Allow
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
              onClick={requestAllPermissions}
              disabled={isRequestingAll}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{isRequestingAll ? 'Requesting Permissions...' : 'Grant All Permissions in 1-Click'}</span>
            </button>
          ) : (
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
              <p className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All device permissions are active & ready!
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
