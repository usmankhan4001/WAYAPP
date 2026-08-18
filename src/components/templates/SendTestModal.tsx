'use client';

import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface SendTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: any;
}

export function SendTestModal({ isOpen, onClose, template }: SendTestModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [var1, setVar1] = useState('Test User');
  const [var2, setVar2] = useState('Apex Store');
  const [var3, setVar3] = useState('PROMO50');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen || !template) return null;

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          templateName: template.name,
          languageCode: template.language || 'en_US',
          bodyVariables: [var1, var2, var3],
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to dispatch test message');
      }

      setResult({
        success: true,
        message: data.message || `Test message dispatched to ${phoneNumber}`,
      });
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Send Test WhatsApp Message</h3>
              <p className="text-[11px] text-slate-500">Template: {template.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSendTest} className="p-6 space-y-4">
          {result && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                result.success
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient WhatsApp Number (E.164) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="+971501234567 or +12025550143"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">Include country code with + symbol</p>
          </div>

          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-xs font-bold text-slate-700">Sample Test Parameters</span>
            <div className="grid grid-cols-1 gap-2">
              <input
                type="text"
                placeholder="{{1}} value (e.g. Name)"
                value={var1}
                onChange={(e) => setVar1(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
              <input
                type="text"
                placeholder="{{2}} value (e.g. Company or Order)"
                value={var2}
                onChange={(e) => setVar2(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
              <input
                type="text"
                placeholder="{{3}} value (e.g. Code)"
                value={var3}
                onChange={(e) => setVar3(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-60 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending Test...' : 'Dispatch Test'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
