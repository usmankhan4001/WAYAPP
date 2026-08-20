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
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  const checkPermissions = async () => {
    if (typeof window === 'undefined') return;

    // 1. Notification Permission
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
    } else {
      setNotificationStatus(Notification.permission as PermissionStatus);
    }

    // 2. Microphone & Camera Permissions (via Permissions API if supported)
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const micQuery = await navigator.permissions.query({ name: 'microphone' as any });
        setMicStatus(micQuery.state as PermissionStatus);
        micQuery.onchange = () => setMicStatus(micQuery.state as PermissionStatus);
      } catch {
        // Fallback
      }

      try {
        const cameraQuery = await navigator.permissions.query({ name: 'camera' as any });
        setCameraStatus(cameraQuery.state as PermissionStatus);
        cameraQuery.onchange = () => setCameraStatus(cameraQuery.state as PermissionStatus);
      } catch {
        // Fallback
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkPermissions();
    }
  }, [isOpen]);

  const requestNotification = async () => {
    if (!('Notification' in window)) {
      alert('Notifications are not supported in this browser.');
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setNotificationStatus(res as PermissionStatus);
      if (res === 'granted') {
        new Notification('WAYAPP Notifications Active', {
          body: 'You will receive real-time alerts when WhatsApp customers message you.',
          icon: '/favicon.svg',
        });
        setTestNotificationSent(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const requestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('granted');
      // Stop tracks immediately after granting
      stream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.warn('Microphone access denied or error:', e);
      setMicStatus('denied');
    }
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStatus('granted');
      // Stop tracks immediately after granting
      stream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.warn('Camera access denied or error:', e);
      setCameraStatus('denied');
    }
  };

  const requestAllPermissions = async () => {
    setIsRequestingAll(true);
    await requestNotification();
    await requestMicrophone();
    await requestCamera();
    setIsRequestingAll(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Device Permissions</h3>
              <p className="text-xs text-slate-500">Enable features for WhatsApp live chatting</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permissions List */}
        <div className="space-y-3">
          {/* Notification Permission Card */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900">Push Notifications</h4>
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
                      Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">Real-time alerts for inbound customer replies</p>
              </div>
            </div>

            {notificationStatus !== 'granted' ? (
              <button
                onClick={requestNotification}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm shrink-0 transition-all"
              >
                Enable
              </button>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
          </div>

          {/* Microphone Permission Card */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900">Microphone</h4>
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
                      Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">Record and send direct WhatsApp voice notes</p>
              </div>
            </div>

            {micStatus !== 'granted' ? (
              <button
                onClick={requestMicrophone}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm shrink-0 transition-all"
              >
                Enable
              </button>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
          </div>

          {/* Camera Permission Card */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900">Camera</h4>
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
                      Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">Take and attach instant photos/videos</p>
              </div>
            </div>

            {cameraStatus !== 'granted' ? (
              <button
                onClick={requestCamera}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm shrink-0 transition-all"
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
              onClick={requestAllPermissions}
              disabled={isRequestingAll}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{isRequestingAll ? 'Requesting Access...' : 'Enable All Permissions'}</span>
            </button>
          ) : (
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
              <p className="text-xs font-bold text-emerald-800">
                All device permissions are active & ready!
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
